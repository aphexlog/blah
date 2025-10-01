import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from './errorHandler';
import { User, UserRole } from '../types';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw createError('No token provided', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        preferences: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user || !user.isActive) {
      throw createError('Invalid token or user not found', 401);
    }

    req.user = user as User;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(createError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireOwnership = (resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      let isOwner = false;

      switch (resource) {
        case 'form':
          const form = await prisma.form.findFirst({
            where: { 
              id: resourceId,
              organizationId,
              createdBy: userId
            }
          });
          isOwner = !!form;
          break;

        case 'submission':
          const submission = await prisma.dataSubmission.findFirst({
            where: {
              id: resourceId,
              submittedBy: userId
            },
            include: {
              form: {
                select: {
                  organizationId: true
                }
              }
            }
          });
          isOwner = !!submission && submission.form.organizationId === organizationId;
          break;

        default:
          throw createError('Invalid resource type', 400);
      }

      if (!isOwner && req.user.role !== UserRole.ADMIN) {
        throw createError('Access denied', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};