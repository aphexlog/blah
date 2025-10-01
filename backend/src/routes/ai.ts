import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AIService } from '../services/aiService';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { ApiResponse, AIInsight } from '../types';

const router = Router();
const aiService = new AIService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }
  next();
};

// Validate field data using AI
router.post('/validate-field',
  authMiddleware,
  [
    body('fieldType').isString(),
    body('value').exists(),
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fieldType, value, context } = req.body;
      
      const validationResult = await aiService.validateFieldData(
        fieldType,
        value,
        context
      );

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

// Generate smart suggestions for field completion
router.post('/suggest',
  authMiddleware,
  [
    body('fieldType').isString(),
    body('partialValue').isString(),
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { fieldType, partialValue, context } = req.body;
      
      const suggestions = await aiService.generateSuggestions(
        fieldType,
        partialValue,
        context
      );

      const response: ApiResponse<string[]> = {
        success: true,
        data: suggestions,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Detect anomalies in submission data
router.post('/detect-anomalies',
  authMiddleware,
  [
    body('formId').isUUID(),
    body('submissionData').isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { formId, submissionData } = req.body;
      const organizationId = req.user.organizationId;
      
      const anomalies = await aiService.detectAnomalies(
        formId,
        submissionData,
        organizationId
      );

      const response: ApiResponse = {
        success: true,
        data: { anomalies },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Generate data summary and insights
router.post('/generate-summary',
  authMiddleware,
  [
    body('formId').isUUID(),
    body('timeRange').optional().isObject(),
    body('filters').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { formId, timeRange, filters } = req.body;
      const organizationId = req.user.organizationId;
      
      const summary = await aiService.generateDataSummary(
        formId,
        organizationId,
        { timeRange, filters }
      );

      const response: ApiResponse = {
        success: true,
        data: summary,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Process natural language query
router.post('/query',
  authMiddleware,
  [
    body('query').isString().isLength({ min: 1, max: 500 }),
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { query, context } = req.body;
      const organizationId = req.user.organizationId;
      
      const result = await aiService.processNaturalLanguageQuery(
        query,
        organizationId,
        context
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get AI insights for a form or submission
router.get('/insights/:type/:id',
  authMiddleware,
  [
    param('type').isIn(['form', 'submission']),
    param('id').isUUID()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { type, id } = req.params;
      const organizationId = req.user.organizationId;
      
      const insights = await aiService.getInsights(type, id, organizationId);

      const response: ApiResponse<AIInsight[]> = {
        success: true,
        data: insights,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Train custom AI model with form data
router.post('/train-model',
  authMiddleware,
  [
    body('formId').isUUID(),
    body('modelType').isIn(['validation', 'prediction', 'classification']),
    body('trainingConfig').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { formId, modelType, trainingConfig } = req.body;
      const organizationId = req.user.organizationId;
      
      const trainingJob = await aiService.trainCustomModel(
        formId,
        modelType,
        organizationId,
        trainingConfig
      );

      const response: ApiResponse = {
        success: true,
        data: trainingJob,
        message: 'Model training started',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get model training status
router.get('/training-status/:jobId',
  authMiddleware,
  [param('jobId').isUUID()],
  validateRequest,
  async (req, res, next) => {
    try {
      const jobId = req.params.jobId;
      const organizationId = req.user.organizationId;
      
      const status = await aiService.getTrainingStatus(jobId, organizationId);

      const response: ApiResponse = {
        success: true,
        data: status,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export { router as aiRoutes };