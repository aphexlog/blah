import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import { VoiceService } from '../services/voiceService';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { ApiResponse, VoiceData } from '../types';

const router = Router();
const voiceService = new VoiceService();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/webm',
      'audio/ogg'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }
  next();
};

// Process audio file for speech-to-text
router.post('/transcribe',
  authMiddleware,
  upload.single('audio'),
  [
    body('fieldId').optional().isUUID(),
    body('submissionId').optional().isUUID(),
    body('language').optional().isString(),
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw createError('Audio file is required', 400);
      }

      const { fieldId, submissionId, language, context } = req.body;
      
      const result = await voiceService.transcribeAudio(
        req.file.buffer,
        req.file.mimetype,
        {
          fieldId,
          submissionId,
          language: language || 'en-US',
          context: context ? JSON.parse(context) : undefined,
          userId: req.user.id
        }
      );

      const response: ApiResponse<VoiceData> = {
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

// Process real-time voice stream
router.post('/stream-transcribe',
  authMiddleware,
  [
    body('audioChunk').isString(), // Base64 encoded audio chunk
    body('sessionId').isUUID(),
    body('isLast').optional().isBoolean(),
    body('language').optional().isString()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { audioChunk, sessionId, isLast, language } = req.body;
      
      const result = await voiceService.processStreamingAudio(
        audioChunk,
        sessionId,
        {
          isLast: isLast || false,
          language: language || 'en-US',
          userId: req.user.id
        }
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

// Convert text to speech
router.post('/synthesize',
  authMiddleware,
  [
    body('text').isString().isLength({ min: 1, max: 5000 }),
    body('language').optional().isString(),
    body('voice').optional().isString(),
    body('speed').optional().isFloat({ min: 0.5, max: 2.0 })
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { text, language, voice, speed } = req.body;
      
      const audioUrl = await voiceService.synthesizeSpeech(text, {
        language: language || 'en-US',
        voice: voice || 'en-US-JennyNeural',
        speed: speed || 1.0
      });

      const response: ApiResponse<{ audioUrl: string }> = {
        success: true,
        data: { audioUrl },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Process voice command
router.post('/command',
  authMiddleware,
  upload.single('audio'),
  [
    body('context').optional().isObject()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw createError('Audio file is required', 400);
      }

      const { context } = req.body;
      
      const result = await voiceService.processVoiceCommand(
        req.file.buffer,
        req.file.mimetype,
        {
          context: context ? JSON.parse(context) : undefined,
          userId: req.user.id
        }
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

// Get voice data by ID
router.get('/:id',
  authMiddleware,
  [param('id').isUUID()],
  validateRequest,
  async (req, res, next) => {
    try {
      const voiceDataId = req.params.id;
      const organizationId = req.user.organizationId;
      
      const voiceData = await voiceService.getVoiceData(voiceDataId, organizationId);
      
      if (!voiceData) {
        throw createError('Voice data not found', 404);
      }

      const response: ApiResponse<VoiceData> = {
        success: true,
        data: voiceData,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get supported languages and voices
router.get('/config/voices',
  authMiddleware,
  async (req, res, next) => {
    try {
      const voices = await voiceService.getSupportedVoices();

      const response: ApiResponse = {
        success: true,
        data: voices,
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Update voice processing settings
router.put('/settings',
  authMiddleware,
  [
    body('defaultLanguage').optional().isString(),
    body('defaultVoice').optional().isString(),
    body('autoTranscribe').optional().isBoolean(),
    body('noiseReduction').optional().isBoolean()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const settings = req.body;
      const userId = req.user.id;
      
      const updatedSettings = await voiceService.updateUserVoiceSettings(
        userId,
        settings
      );

      const response: ApiResponse = {
        success: true,
        data: updatedSettings,
        message: 'Voice settings updated successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Process voice input for form field
router.post('/field-input',
  authMiddleware,
  upload.single('audio'),
  [
    body('fieldId').isUUID(),
    body('fieldType').isString(),
    body('submissionId').optional().isUUID(),
    body('language').optional().isString()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw createError('Audio file is required', 400);
      }

      const { fieldId, fieldType, submissionId, language } = req.body;
      
      const result = await voiceService.processVoiceFieldInput(
        req.file.buffer,
        req.file.mimetype,
        {
          fieldId,
          fieldType,
          submissionId,
          language: language || 'en-US',
          userId: req.user.id
        }
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

export { router as voiceRoutes };