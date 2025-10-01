import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { SyncService } from '../services/syncService';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { ApiResponse, SyncData, SyncAction } from '../types';

const router = Router();
const syncService = new SyncService();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }
  next();
};

// Sync offline data to server
router.post('/upload',
  authMiddleware,
  [
    body('deviceId').isString(),
    body('syncData').isArray(),
    body('lastSyncTimestamp').optional().isISO8601()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { deviceId, syncData, lastSyncTimestamp } = req.body;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      const result = await syncService.syncFromDevice({
        deviceId,
        syncData,
        lastSyncTimestamp,
        userId,
        organizationId
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Data synchronized successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get server changes for client sync
router.get('/download',
  authMiddleware,
  [
    query('deviceId').isString(),
    query('lastSyncTimestamp').optional().isISO8601(),
    query('formIds').optional().isString() // Comma-separated form IDs
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const deviceId = req.query.deviceId as string;
      const lastSyncTimestamp = req.query.lastSyncTimestamp as string;
      const formIds = req.query.formIds as string;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      const changes = await syncService.getServerChanges({
        deviceId,
        lastSyncTimestamp,
        formIds: formIds ? formIds.split(',') : undefined,
        userId,
        organizationId
      });

      const response: ApiResponse = {
        success: true,
        data: changes,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Register device
router.post('/register-device',
  authMiddleware,
  [
    body('deviceId').isString(),
    body('deviceInfo').isObject(),
    body('capabilities').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { deviceId, deviceInfo, capabilities } = req.body;
      const userId = req.user.id;

      const device = await syncService.registerDevice({
        deviceId,
        deviceInfo,
        capabilities: capabilities || {},
        userId
      });

      const response: ApiResponse = {
        success: true,
        data: device,
        message: 'Device registered successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get sync status
router.get('/status',
  authMiddleware,
  [
    query('deviceId').optional().isString()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const deviceId = req.query.deviceId as string;
      const userId = req.user.id;

      const status = await syncService.getSyncStatus(userId, deviceId);

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

// Resolve sync conflicts
router.post('/resolve-conflicts',
  authMiddleware,
  [
    body('conflicts').isArray(),
    body('resolutions').isArray()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { conflicts, resolutions } = req.body;
      const userId = req.user.id;

      const result = await syncService.resolveConflicts(conflicts, resolutions, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Conflicts resolved successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Ping for connectivity check
router.get('/ping',
  authMiddleware,
  async (req, res) => {
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'online',
        serverTime: new Date(),
        userId: req.user.id
      },
      timestamp: new Date()
    };

    res.json(response);
  }
);

// Get forms available for offline use
router.get('/offline-forms',
  authMiddleware,
  async (req, res, next) => {
    try {
      const organizationId = req.user.organizationId;
      
      const forms = await syncService.getOfflineEnabledForms(organizationId);

      const response: ApiResponse = {
        success: true,
        data: forms,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export { router as syncRoutes };