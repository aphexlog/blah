import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { ApiResponse, User, UserRole } from '../types';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }
  next();
};

// Register new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('firstName').isString().trim().isLength({ min: 1, max: 50 }),
    body('lastName').isString().trim().isLength({ min: 1, max: 50 }),
    body('organizationId').isUUID(),
    body('role').optional().isIn(Object.values(UserRole))
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, organizationId, role } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw createError('User already exists with this email', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          organizationId,
          role: role || UserRole.DATA_COLLECTOR,
          preferences: {
            language: 'en',
            timezone: 'UTC',
            theme: 'auto',
            notifications: {
              email: true,
              push: false,
              formSubmissions: true,
              dataValidation: true,
              systemUpdates: false
            },
            accessibility: {
              highContrast: false,
              largeText: false,
              screenReader: false,
              voiceInput: false,
              keyboardNavigation: false
            }
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          preferences: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          user,
          token,
          expiresIn: JWT_EXPIRES_IN
        },
        message: 'User registered successfully',
        timestamp: new Date()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 })
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        throw createError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw createError('Invalid credentials', 401);
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      const response: ApiResponse = {
        success: true,
        data: {
          user: userWithoutPassword,
          token,
          expiresIn: JWT_EXPIRES_IN
        },
        message: 'Login successful',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post('/refresh',
  [
    body('token').isString()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { token } = req.body;

      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get user to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        throw createError('Invalid token', 401);
      }

      // Generate new token
      const newToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          token: newToken,
          expiresIn: JWT_EXPIRES_IN
        },
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        next(createError('Invalid token', 401));
      } else {
        next(error);
      }
    }
  }
);

// Logout (client-side token invalidation)
router.post('/logout', (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Logout successful',
    timestamp: new Date()
  };

  res.json(response);
});

// Password reset request
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail()
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists or not
        const response: ApiResponse = {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.',
          timestamp: new Date()
        };
        return res.json(response);
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // In production, send email with reset link
      // For now, just log it
      console.log(`Password reset token for ${email}: ${resetToken}`);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset link has been sent to your email.',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Reset password
router.post('/reset-password',
  [
    body('token').isString(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Verify reset token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.type !== 'password-reset') {
        throw createError('Invalid reset token', 401);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Password has been reset successfully',
        timestamp: new Date()
      };

      res.json(response);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        next(createError('Invalid or expired reset token', 401));
      } else {
        next(error);
      }
    }
  }
);

export { router as authRoutes };