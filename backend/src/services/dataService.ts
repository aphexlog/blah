import { PrismaClient } from '@prisma/client';
import { DataSubmission, SubmissionStatus, PaginationInfo } from '../types';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class DataService {
  async submitData(data: {
    formId: string;
    data: Record<string, any>;
    status: SubmissionStatus;
    geoLocation?: any;
    submittedBy: string;
    organizationId: string;
  }): Promise<DataSubmission> {
    try {
      const submission = await prisma.dataSubmission.create({
        data: {
          formId: data.formId,
          submittedBy: data.submittedBy,
          data: data.data as any,
          status: data.status,
          geoLocation: data.geoLocation as any,
          validationResults: [],
          aiInsights: [],
          attachments: [],
          version: 1
        }
      });

      logger.info(`Data submitted: ${submission.id} by user ${data.submittedBy}`);
      return submission as DataSubmission;
    } catch (error) {
      logger.error('Data submission failed:', error);
      throw createError('Failed to submit data', 500);
    }
  }

  async getSubmissions(
    filters: any,
    pagination: { page: number; limit: number }
  ): Promise<{ submissions: DataSubmission[]; pagination: PaginationInfo }> {
    try {
      const skip = (pagination.page - 1) * pagination.limit;
      
      const where: any = {
        form: {
          organizationId: filters.organizationId
        }
      };

      if (filters.formId) where.formId = filters.formId;
      if (filters.status) where.status = filters.status;
      if (filters.submittedBy) where.submittedBy = filters.submittedBy;
      if (filters.startDate || filters.endDate) {
        where.submittedAt = {};
        if (filters.startDate) where.submittedAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.submittedAt.lte = new Date(filters.endDate);
      }

      const [submissions, total] = await Promise.all([
        prisma.dataSubmission.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy: { submittedAt: 'desc' },
          include: {
            form: {
              select: { name: true }
            }
          }
        }),
        prisma.dataSubmission.count({ where })
      ]);

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        submissions: submissions as DataSubmission[],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to get submissions:', error);
      throw createError('Failed to retrieve submissions', 500);
    }
  }

  async getSubmissionById(id: string, organizationId: string): Promise<DataSubmission | null> {
    try {
      const submission = await prisma.dataSubmission.findFirst({
        where: {
          id,
          form: {
            organizationId
          }
        },
        include: {
          form: true,
          validationResults: true,
          aiInsights: true
        }
      });

      return submission as DataSubmission;
    } catch (error) {
      logger.error('Failed to get submission:', error);
      return null;
    }
  }

  async updateSubmission(
    id: string,
    updates: any,
    organizationId: string,
    userId: string
  ): Promise<DataSubmission> {
    try {
      const submission = await prisma.dataSubmission.update({
        where: {
          id,
          form: {
            organizationId
          }
        },
        data: {
          ...updates,
          lastModified: new Date(),
          version: { increment: 1 }
        }
      });

      logger.info(`Submission updated: ${id} by user ${userId}`);
      return submission as DataSubmission;
    } catch (error) {
      logger.error('Failed to update submission:', error);
      throw createError('Failed to update submission', 500);
    }
  }

  async deleteSubmission(id: string, organizationId: string, userId: string): Promise<void> {
    try {
      await prisma.dataSubmission.delete({
        where: {
          id,
          form: {
            organizationId
          }
        }
      });

      logger.info(`Submission deleted: ${id} by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete submission:', error);
      throw createError('Failed to delete submission', 500);
    }
  }

  async validateData(formId: string, data: Record<string, any>, organizationId: string): Promise<any> {
    try {
      // Basic validation logic - in production, this would be more sophisticated
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: []
      };
    } catch (error) {
      logger.error('Data validation failed:', error);
      throw createError('Failed to validate data', 500);
    }
  }

  async exportData(options: {
    formId: string;
    format: string;
    filters: any;
    includeMetadata: boolean;
    organizationId: string;
    userId: string;
  }): Promise<any> {
    try {
      // Export logic would go here
      return {
        downloadUrl: `/api/data/export/${options.formId}`,
        format: options.format,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Data export failed:', error);
      throw createError('Failed to export data', 500);
    }
  }

  async getDataStatistics(formId: string, timeRange: string, organizationId: string): Promise<any> {
    try {
      const stats = await prisma.dataSubmission.groupBy({
        by: ['status'],
        where: {
          formId,
          form: {
            organizationId
          }
        },
        _count: true
      });

      return {
        totalSubmissions: stats.reduce((sum, stat) => sum + stat._count, 0),
        byStatus: stats,
        timeRange
      };
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      throw createError('Failed to get statistics', 500);
    }
  }
}