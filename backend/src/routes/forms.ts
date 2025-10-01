import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { FormService } from '../services/formService';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { ApiResponse, Form, FormStatus } from '../types';

const router = Router();
const formService = new FormService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }
  next();
};

// Get all forms with pagination and filtering
router.get('/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(Object.values(FormStatus)),
    query('search').optional().isString()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as FormStatus;
      const search = req.query.search as string;
      const organizationId = req.user.organizationId;

      const result = await formService.getForms({
        page,
        limit,
        status,
        search,
        organizationId
      });

      const response: ApiResponse<Form[]> = {
        success: true,
        data: result.forms,
        pagination: result.pagination,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get form by ID
router.get('/:id',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req, res, next) => {
    try {
      const formId = req.params.id;
      const organizationId = req.user.organizationId;

      const form = await formService.getFormById(formId, organizationId);
      
      if (!form) {
        throw createError('Form not found', 404);
      }

      const response: ApiResponse<Form> = {
        success: true,
        data: form,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Create new form
router.post('/',
  authMiddleware,
  [
    body('name').isString().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString().trim().isLength({ max: 1000 }),
    body('schema').isObject(),
    body('validationRules').optional().isArray(),
    body('conditionalLogic').optional().isArray()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const formData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.id
      };

      const form = await formService.createForm(formData);

      const response: ApiResponse<Form> = {
        success: true,
        data: form,
        message: 'Form created successfully',
        timestamp: new Date()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update form
router.put('/:id',
  authMiddleware,
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString().trim().isLength({ max: 1000 }),
    body('schema').optional().isObject(),
    body('status').optional().isIn(Object.values(FormStatus)),
    body('validationRules').optional().isArray(),
    body('conditionalLogic').optional().isArray()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const formId = req.params.id;
      const organizationId = req.user.organizationId;
      const updateData = req.body;

      const form = await formService.updateForm(formId, updateData, organizationId);

      const response: ApiResponse<Form> = {
        success: true,
        data: form,
        message: 'Form updated successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Delete form
router.delete('/:id',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req, res, next) => {
    try {
      const formId = req.params.id;
      const organizationId = req.user.organizationId;

      await formService.deleteForm(formId, organizationId);

      const response: ApiResponse = {
        success: true,
        message: 'Form deleted successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Clone form
router.post('/:id/clone',
  authMiddleware,
  [
    param('id').isUUID(),
    body('name').isString().trim().isLength({ min: 1, max: 255 })
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const formId = req.params.id;
      const newName = req.body.name;
      const organizationId = req.user.organizationId;

      const clonedForm = await formService.cloneForm(formId, newName, organizationId, req.user.id);

      const response: ApiResponse<Form> = {
        success: true,
        data: clonedForm,
        message: 'Form cloned successfully',
        timestamp: new Date()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Validate form schema
router.post('/validate-schema',
  authMiddleware,
  [body('schema').isObject()],
  validateRequest,
  async (req, res, next) => {
    try {
      const schema = req.body.schema;
      const validationResult = await formService.validateFormSchema(schema);

      const response: ApiResponse = {
        success: validationResult.isValid,
        data: validationResult,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export { router as formRoutes };