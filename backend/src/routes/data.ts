import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataService } from '../services/dataService';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { ApiResponse, DataSubmission, SubmissionStatus } from '../types';

const router = Router();
const dataService = new DataService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }
  next();
};

// Submit form data
router.post('/submit',
  authMiddleware,
  [
    body('formId').isUUID(),
    body('data').isObject(),
    body('status').optional().isIn(Object.values(SubmissionStatus)),
    body('geoLocation').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { formId, data, status, geoLocation } = req.body;
      
      const submission = await dataService.submitData({
        formId,
        data,
        status: status || SubmissionStatus.SUBMITTED,
        geoLocation,
        submittedBy: req.user.id,
        organizationId: req.user.organizationId
      });

      const response: ApiResponse<DataSubmission> = {
        success: true,
        data: submission,
        message: 'Data submitted successfully',
        timestamp: new Date()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get submissions with filtering and pagination
router.get('/submissions',
  authMiddleware,
  [
    query('formId').optional().isUUID(),
    query('status').optional().isIn(Object.values(SubmissionStatus)),
    query('submittedBy').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const filters = {
        formId: req.query.formId as string,
        status: req.query.status as SubmissionStatus,
        submittedBy: req.query.submittedBy as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        organizationId: req.user.organizationId
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await dataService.getSubmissions(filters, pagination);

      const response: ApiResponse<DataSubmission[]> = {
        success: true,
        data: result.submissions,
        pagination: result.pagination,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get submission by ID
router.get('/submissions/:id',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req, res, next) => {
    try {
      const submissionId = req.params.id;
      const organizationId = req.user.organizationId;

      const submission = await dataService.getSubmissionById(submissionId, organizationId);
      
      if (!submission) {
        throw createError('Submission not found', 404);
      }

      const response: ApiResponse<DataSubmission> = {
        success: true,
        data: submission,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update submission
router.put('/submissions/:id',
  authMiddleware,
  [
    param('id').isUUID(),
    body('data').optional().isObject(),
    body('status').optional().isIn(Object.values(SubmissionStatus))
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const submissionId = req.params.id;
      const updates = req.body;
      const organizationId = req.user.organizationId;

      const submission = await dataService.updateSubmission(
        submissionId,
        updates,
        organizationId,
        req.user.id
      );

      const response: ApiResponse<DataSubmission> = {
        success: true,
        data: submission,
        message: 'Submission updated successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Delete submission
router.delete('/submissions/:id',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req, res, next) => {
    try {
      const submissionId = req.params.id;
      const organizationId = req.user.organizationId;

      await dataService.deleteSubmission(submissionId, organizationId, req.user.id);

      const response: ApiResponse = {
        success: true,
        message: 'Submission deleted successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Validate submission data
router.post('/validate',
  authMiddleware,
  [
    body('formId').isUUID(),
    body('data').isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { formId, data } = req.body;
      const organizationId = req.user.organizationId;

      const validationResult = await dataService.validateData(formId, data, organizationId);

      const response: ApiResponse = {
        success: true,
        data: validationResult,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Export data
router.post('/export',
  authMiddleware,
  [
    body('formId').isUUID(),
    body('format').isIn(['csv', 'xlsx', 'json']),
    body('filters').optional().isObject(),
    body('includeMetadata').optional().isBoolean()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { formId, format, filters, includeMetadata } = req.body;
      const organizationId = req.user.organizationId;

      const exportResult = await dataService.exportData({
        formId,
        format,
        filters: filters || {},
        includeMetadata: includeMetadata || false,
        organizationId,
        userId: req.user.id
      });

      const response: ApiResponse = {
        success: true,
        data: exportResult,
        message: 'Data export completed',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get data statistics
router.get('/stats/:formId',
  authMiddleware,
  [
    param('formId').isUUID(),
    query('timeRange').optional().isIn(['day', 'week', 'month', 'year', 'all'])
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const formId = req.params.formId;
      const timeRange = req.query.timeRange as string || 'all';
      const organizationId = req.user.organizationId;

      const stats = await dataService.getDataStatistics(formId, timeRange, organizationId);

      const response: ApiResponse = {
        success: true,
        data: stats,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export { router as dataRoutes };