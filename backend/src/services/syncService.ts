import { PrismaClient } from '@prisma/client';
import { SyncData, SyncAction } from '../types';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class SyncService {
  async syncFromDevice(options: {
    deviceId: string;
    syncData: any[];
    lastSyncTimestamp?: string;
    userId: string;
    organizationId: string;
  }): Promise<any> {
    try {
      const results = {
        processed: 0,
        conflicts: [],
        errors: []
      };

      for (const item of options.syncData) {
        try {
          // Process each sync item
          await this.processSyncItem(item, options.userId, options.organizationId);
          results.processed++;
        } catch (error) {
          results.errors.push({
            item: item.id,
            error: error.message
          });
        }
      }

      logger.info(`Sync completed for device ${options.deviceId}: ${results.processed} items processed`);
      return results;
    } catch (error) {
      logger.error('Sync from device failed:', error);
      throw createError('Failed to sync data from device', 500);
    }
  }

  async getServerChanges(options: {
    deviceId: string;
    lastSyncTimestamp?: string;
    formIds?: string[];
    userId: string;
    organizationId: string;
  }): Promise<any> {
    try {
      const since = options.lastSyncTimestamp ? new Date(options.lastSyncTimestamp) : new Date(0);
      
      const changes = {
        forms: [],
        submissions: [],
        deletions: [],
        timestamp: new Date()
      };

      // Get form changes
      const formChanges = await prisma.form.findMany({
        where: {
          organizationId: options.organizationId,
          updatedAt: { gt: since },
          ...(options.formIds && { id: { in: options.formIds } })
        }
      });
      changes.forms = formChanges;

      // Get submission changes
      const submissionChanges = await prisma.dataSubmission.findMany({
        where: {
          form: {
            organizationId: options.organizationId
          },
          lastModified: { gt: since }
        }
      });
      changes.submissions = submissionChanges;

      return changes;
    } catch (error) {
      logger.error('Failed to get server changes:', error);
      throw createError('Failed to get server changes', 500);
    }
  }

  async registerDevice(options: {
    deviceId: string;
    deviceInfo: any;
    capabilities: any;
    userId: string;
  }): Promise<any> {
    try {
      const device = await prisma.device.upsert({
        where: { deviceId: options.deviceId },
        update: {
          deviceInfo: options.deviceInfo as any,
          capabilities: options.capabilities as any,
          lastSeen: new Date()
        },
        create: {
          deviceId: options.deviceId,
          userId: options.userId,
          deviceInfo: options.deviceInfo as any,
          capabilities: options.capabilities as any,
          registeredAt: new Date(),
          lastSeen: new Date()
        }
      });

      logger.info(`Device registered: ${options.deviceId} for user ${options.userId}`);
      return device;
    } catch (error) {
      logger.error('Device registration failed:', error);
      throw createError('Failed to register device', 500);
    }
  }

  async getSyncStatus(userId: string, deviceId?: string): Promise<any> {
    try {
      const status = {
        lastSync: null,
        pendingChanges: 0,
        conflicts: 0,
        deviceInfo: null
      };

      if (deviceId) {
        const device = await prisma.device.findUnique({
          where: { deviceId }
        });
        
        if (device) {
          status.deviceInfo = device;
          status.lastSync = device.lastSeen;
        }
      }

      // Count pending changes
      const pendingCount = await prisma.syncQueue.count({
        where: {
          userId,
          synced: false
        }
      });
      status.pendingChanges = pendingCount;

      return status;
    } catch (error) {
      logger.error('Failed to get sync status:', error);
      throw createError('Failed to get sync status', 500);
    }
  }

  async resolveConflicts(conflicts: any[], resolutions: any[], userId: string): Promise<any> {
    try {
      const results = {
        resolved: 0,
        failed: 0
      };

      for (let i = 0; i < conflicts.length; i++) {
        try {
          const conflict = conflicts[i];
          const resolution = resolutions[i];
          
          await this.applyConflictResolution(conflict, resolution, userId);
          results.resolved++;
        } catch (error) {
          results.failed++;
          logger.error('Conflict resolution failed:', error);
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to resolve conflicts:', error);
      throw createError('Failed to resolve conflicts', 500);
    }
  }

  async getOfflineEnabledForms(organizationId: string): Promise<any[]> {
    try {
      const forms = await prisma.form.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          // Add offline-enabled flag when implementing
        },
        select: {
          id: true,
          name: true,
          description: true,
          schema: true,
          version: true,
          updatedAt: true
        }
      });

      return forms;
    } catch (error) {
      logger.error('Failed to get offline forms:', error);
      throw createError('Failed to get offline forms', 500);
    }
  }

  private async processSyncItem(item: any, userId: string, organizationId: string): Promise<void> {
    switch (item.action) {
      case 'CREATE_SUBMISSION':
        await this.createSubmissionFromSync(item.data, userId, organizationId);
        break;
      case 'UPDATE_SUBMISSION':
        await this.updateSubmissionFromSync(item.data, userId, organizationId);
        break;
      case 'DELETE_SUBMISSION':
        await this.deleteSubmissionFromSync(item.data, userId, organizationId);
        break;
      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  private async createSubmissionFromSync(data: any, userId: string, organizationId: string): Promise<void> {
    await prisma.dataSubmission.create({
      data: {
        ...data,
        submittedBy: userId,
        synced: true,
        syncedAt: new Date()
      }
    });
  }

  private async updateSubmissionFromSync(data: any, userId: string, organizationId: string): Promise<void> {
    await prisma.dataSubmission.update({
      where: { id: data.id },
      data: {
        ...data,
        synced: true,
        syncedAt: new Date()
      }
    });
  }

  private async deleteSubmissionFromSync(data: any, userId: string, organizationId: string): Promise<void> {
    await prisma.dataSubmission.delete({
      where: { id: data.id }
    });
  }

  private async applyConflictResolution(conflict: any, resolution: any, userId: string): Promise<void> {
    // Apply the conflict resolution based on the resolution type
    switch (resolution.type) {
      case 'SERVER_WINS':
        // Keep server version, discard client changes
        break;
      case 'CLIENT_WINS':
        // Apply client changes, overwrite server
        await this.updateSubmissionFromSync(conflict.clientData, userId, conflict.organizationId);
        break;
      case 'MERGE':
        // Merge the changes
        const mergedData = { ...conflict.serverData, ...conflict.clientData };
        await this.updateSubmissionFromSync(mergedData, userId, conflict.organizationId);
        break;
      default:
        throw new Error(`Unknown resolution type: ${resolution.type}`);
    }
  }
}