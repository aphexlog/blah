import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { Form, FormStatus, FormSchema, PaginationInfo } from '../types';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const redis = createClient();

export class FormService {
  async getForms(options: {
    page: number;
    limit: number;
    status?: FormStatus;
    search?: string;
    organizationId: string;
  }): Promise<{ forms: Form[]; pagination: PaginationInfo }> {
    const { page, limit, status, search, organizationId } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { submissions: true }
          }
        }
      }),
      prisma.form.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      forms: forms as Form[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getFormById(id: string, organizationId: string): Promise<Form | null> {
    // Try to get from cache first
    const cacheKey = `form:${id}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const form = JSON.parse(cached);
      if (form.organizationId === organizationId) {
        return form;
      }
    }

    const form = await prisma.form.findFirst({
      where: { id, organizationId },
      include: {
        validationRules: true,
        conditionalLogic: true,
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (form) {
      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(form));
    }

    return form as Form;
  }

  async createForm(data: Partial<Form>): Promise<Form> {
    // Validate schema before creating
    const schemaValidation = await this.validateFormSchema(data.schema!);
    if (!schemaValidation.isValid) {
      throw createError('Invalid form schema', 400);
    }

    const form = await prisma.form.create({
      data: {
        name: data.name!,
        description: data.description || '',
        schema: data.schema as any,
        status: FormStatus.DRAFT,
        version: 1,
        organizationId: data.organizationId!,
        createdBy: data.createdBy!,
        validationRules: {
          create: data.validationRules || []
        },
        conditionalLogic: {
          create: data.conditionalLogic || []
        }
      },
      include: {
        validationRules: true,
        conditionalLogic: true
      }
    });

    logger.info(`Form created: ${form.id} by user ${data.createdBy}`);
    return form as Form;
  }

  async updateForm(id: string, data: Partial<Form>, organizationId: string): Promise<Form> {
    const existingForm = await this.getFormById(id, organizationId);
    if (!existingForm) {
      throw createError('Form not found', 404);
    }

    // If schema is being updated, validate it
    if (data.schema) {
      const schemaValidation = await this.validateFormSchema(data.schema);
      if (!schemaValidation.isValid) {
        throw createError('Invalid form schema', 400);
      }
    }

    // If changing to active status, ensure form is complete
    if (data.status === FormStatus.ACTIVE && existingForm.status !== FormStatus.ACTIVE) {
      const validation = await this.validateFormCompleteness(existingForm);
      if (!validation.isValid) {
        throw createError(`Cannot activate form: ${validation.errors.join(', ')}`, 400);
      }
    }

    const form = await prisma.form.update({
      where: { id, organizationId },
      data: {
        ...data,
        version: data.schema ? { increment: 1 } : undefined,
        updatedAt: new Date()
      },
      include: {
        validationRules: true,
        conditionalLogic: true
      }
    });

    // Clear cache
    await redis.del(`form:${id}`);

    logger.info(`Form updated: ${id}`);
    return form as Form;
  }

  async deleteForm(id: string, organizationId: string): Promise<void> {
    const form = await this.getFormById(id, organizationId);
    if (!form) {
      throw createError('Form not found', 404);
    }

    // Check if form has submissions
    const submissionCount = await prisma.dataSubmission.count({
      where: { formId: id }
    });

    if (submissionCount > 0) {
      throw createError('Cannot delete form with existing submissions', 400);
    }

    await prisma.form.delete({
      where: { id, organizationId }
    });

    // Clear cache
    await redis.del(`form:${id}`);

    logger.info(`Form deleted: ${id}`);
  }

  async cloneForm(id: string, newName: string, organizationId: string, userId: string): Promise<Form> {
    const originalForm = await this.getFormById(id, organizationId);
    if (!originalForm) {
      throw createError('Form not found', 404);
    }

    const clonedForm = await prisma.form.create({
      data: {
        name: newName,
        description: `Clone of ${originalForm.name}`,
        schema: originalForm.schema as any,
        status: FormStatus.DRAFT,
        version: 1,
        organizationId,
        createdBy: userId,
        validationRules: {
          create: originalForm.validationRules || []
        },
        conditionalLogic: {
          create: originalForm.conditionalLogic || []
        }
      },
      include: {
        validationRules: true,
        conditionalLogic: true
      }
    });

    logger.info(`Form cloned: ${id} -> ${clonedForm.id} by user ${userId}`);
    return clonedForm as Form;
  }

  async validateFormSchema(schema: FormSchema): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!schema || typeof schema !== 'object') {
      errors.push('Schema must be an object');
      return { isValid: false, errors };
    }

    if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
      errors.push('Schema must contain at least one field');
    }

    // Validate fields
    if (schema.fields) {
      schema.fields.forEach((field, index) => {
        if (!field.id || !field.name || !field.type) {
          errors.push(`Field ${index}: id, name, and type are required`);
        }

        if (field.type === 'SELECT' || field.type === 'MULTISELECT' || field.type === 'RADIO') {
          if (!field.options || field.options.length === 0) {
            errors.push(`Field ${field.name}: options are required for ${field.type} fields`);
          }
        }
      });
    }

    // Validate sections
    if (schema.sections) {
      schema.sections.forEach((section, index) => {
        if (!section.id || !section.title) {
          errors.push(`Section ${index}: id and title are required`);
        }

        if (!Array.isArray(section.fieldIds)) {
          errors.push(`Section ${section.title}: fieldIds must be an array`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  private async validateFormCompleteness(form: Form): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!form.name) {
      errors.push('Form name is required');
    }

    if (!form.schema || !form.schema.fields || form.schema.fields.length === 0) {
      errors.push('Form must have at least one field');
    }

    // Check for required fields
    const requiredFields = form.schema?.fields?.filter(field => field.required);
    if (!requiredFields || requiredFields.length === 0) {
      errors.push('Form should have at least one required field');
    }

    return { isValid: errors.length === 0, errors };
  }
}