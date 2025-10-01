import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export const setupSocketIO = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User ${socket.userId} connected via WebSocket`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Handle form collaboration
    socket.on('join-form', (formId: string) => {
      socket.join(`form:${formId}`);
      socket.to(`form:${formId}`).emit('user-joined-form', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    socket.on('leave-form', (formId: string) => {
      socket.leave(`form:${formId}`);
      socket.to(`form:${formId}`).emit('user-left-form', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle real-time data updates
    socket.on('data-entry-start', (submissionId: string) => {
      socket.to(`submission:${submissionId}`).emit('data-entry-active', {
        userId: socket.userId,
        submissionId,
        timestamp: new Date()
      });
    });

    socket.on('data-entry-update', (data: any) => {
      socket.to(`submission:${data.submissionId}`).emit('data-entry-updated', {
        userId: socket.userId,
        data,
        timestamp: new Date()
      });
    });

    // Handle voice input collaboration
    socket.on('voice-recording-start', (fieldId: string) => {
      socket.to(`field:${fieldId}`).emit('voice-recording-active', {
        userId: socket.userId,
        fieldId,
        timestamp: new Date()
      });
    });

    socket.on('voice-recording-stop', (fieldId: string) => {
      socket.to(`field:${fieldId}`).emit('voice-recording-stopped', {
        userId: socket.userId,
        fieldId,
        timestamp: new Date()
      });
    });

    // Handle AI processing updates
    socket.on('ai-processing-start', (data: any) => {
      socket.emit('ai-processing-status', {
        status: 'processing',
        data,
        timestamp: new Date()
      });
    });

    // Handle sync status updates
    socket.on('sync-status-request', () => {
      // This would typically query the database for sync status
      socket.emit('sync-status-update', {
        isOnline: true,
        pendingChanges: 0,
        lastSync: new Date(),
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User ${socket.userId} disconnected: ${reason}`);
      
      // Notify other users in shared forms
      socket.rooms.forEach(room => {
        if (room.startsWith('form:')) {
          socket.to(room).emit('user-disconnected', {
            userId: socket.userId,
            timestamp: new Date()
          });
        }
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // Utility functions for broadcasting updates
  const broadcastToForm = (formId: string, event: string, data: any) => {
    io.to(`form:${formId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  };

  const broadcastToUser = (userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  };

  const broadcastSystemNotification = (event: string, data: any) => {
    io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  };

  // Export utility functions for use in other services
  return {
    broadcastToForm,
    broadcastToUser,
    broadcastSystemNotification,
    io
  };
};

// Extend Socket interface for TypeScript
declare module 'socket.io' {
  interface Socket {
    userId: string;
    userRole: string;
  }
}