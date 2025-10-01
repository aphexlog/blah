import Dexie, { Table } from 'dexie';

// IndexedDB database for offline storage
class EDCDatabase extends Dexie {
  keyValueStore!: Table<{ key: string; value: any }, string>;
  forms!: Table<any, string>;
  submissions!: Table<any, string>;
  syncQueue!: Table<any, string>;

  constructor() {
    super('EDCDatabase');
    
    this.version(1).stores({
      keyValueStore: 'key',
      forms: 'id, name, status, organizationId, updatedAt',
      submissions: 'id, formId, submittedBy, status, submittedAt, synced',
      syncQueue: 'id, action, data, timestamp, synced'
    });
  }
}

const db = new EDCDatabase();

class StorageService {
  // Key-value storage methods
  async setItem(key: string, value: any): Promise<void> {
    try {
      if (this.isIndexedDBSupported()) {
        await db.keyValueStore.put({ key, value });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Storage set error:', error);
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async getItem(key: string): Promise<any> {
    try {
      if (this.isIndexedDBSupported()) {
        const item = await db.keyValueStore.get(key);
        return item?.value;
      } else {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
    } catch (error) {
      console.error('Storage get error:', error);
      // Fallback to localStorage
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isIndexedDBSupported()) {
        await db.keyValueStore.delete(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage remove error:', error);
      localStorage.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isIndexedDBSupported()) {
        await db.keyValueStore.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      localStorage.clear();
    }
  }

  // Form storage methods
  async storeForms(forms: any[]): Promise<void> {
    try {
      await db.forms.bulkPut(forms);
    } catch (error) {
      console.error('Form storage error:', error);
    }
  }

  async getStoredForms(organizationId?: string): Promise<any[]> {
    try {
      if (organizationId) {
        return await db.forms.where('organizationId').equals(organizationId).toArray();
      }
      return await db.forms.toArray();
    } catch (error) {
      console.error('Form retrieval error:', error);
      return [];
    }
  }

  async getStoredForm(id: string): Promise<any | null> {
    try {
      return await db.forms.get(id);
    } catch (error) {
      console.error('Form retrieval error:', error);
      return null;
    }
  }

  async removeStoredForm(id: string): Promise<void> {
    try {
      await db.forms.delete(id);
    } catch (error) {
      console.error('Form removal error:', error);
    }
  }

  // Submission storage methods
  async storeSubmission(submission: any): Promise<void> {
    try {
      await db.submissions.put({
        ...submission,
        synced: false,
        storedAt: new Date()
      });
    } catch (error) {
      console.error('Submission storage error:', error);
    }
  }

  async getStoredSubmissions(formId?: string): Promise<any[]> {
    try {
      if (formId) {
        return await db.submissions.where('formId').equals(formId).toArray();
      }
      return await db.submissions.toArray();
    } catch (error) {
      console.error('Submission retrieval error:', error);
      return [];
    }
  }

  async getUnsyncedSubmissions(): Promise<any[]> {
    try {
      return await db.submissions.where('synced').equals(false).toArray();
    } catch (error) {
      console.error('Unsynced submission retrieval error:', error);
      return [];
    }
  }

  async markSubmissionSynced(id: string): Promise<void> {
    try {
      await db.submissions.update(id, { synced: true, syncedAt: new Date() });
    } catch (error) {
      console.error('Submission sync mark error:', error);
    }
  }

  async removeStoredSubmission(id: string): Promise<void> {
    try {
      await db.submissions.delete(id);
    } catch (error) {
      console.error('Submission removal error:', error);
    }
  }

  // Sync queue methods
  async addToSyncQueue(action: string, data: any): Promise<void> {
    try {
      await db.syncQueue.add({
        id: `${Date.now()}-${Math.random()}`,
        action,
        data,
        timestamp: new Date(),
        synced: false
      });
    } catch (error) {
      console.error('Sync queue add error:', error);
    }
  }

  async getSyncQueue(): Promise<any[]> {
    try {
      return await db.syncQueue.where('synced').equals(false).toArray();
    } catch (error) {
      console.error('Sync queue retrieval error:', error);
      return [];
    }
  }

  async markSyncQueueItemSynced(id: string): Promise<void> {
    try {
      await db.syncQueue.update(id, { synced: true, syncedAt: new Date() });
    } catch (error) {
      console.error('Sync queue mark error:', error);
    }
  }

  async clearSyncQueue(): Promise<void> {
    try {
      await db.syncQueue.clear();
    } catch (error) {
      console.error('Sync queue clear error:', error);
    }
  }

  // Utility methods
  async getStorageInfo(): Promise<{
    totalSize: number;
    usedSize: number;
    formCount: number;
    submissionCount: number;
    syncQueueSize: number;
  }> {
    try {
      const [formCount, submissionCount, syncQueueSize] = await Promise.all([
        db.forms.count(),
        db.submissions.count(),
        db.syncQueue.count()
      ]);

      // Estimate storage usage (rough calculation)
      const estimate = await this.estimateStorageUsage();

      return {
        totalSize: estimate.quota || 0,
        usedSize: estimate.usage || 0,
        formCount,
        submissionCount,
        syncQueueSize
      };
    } catch (error) {
      console.error('Storage info error:', error);
      return {
        totalSize: 0,
        usedSize: 0,
        formCount: 0,
        submissionCount: 0,
        syncQueueSize: 0
      };
    }
  }

  private async estimateStorageUsage(): Promise<{ usage?: number; quota?: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        return await navigator.storage.estimate();
      }
      return {};
    } catch (error) {
      console.error('Storage estimation error:', error);
      return {};
    }
  }

  private isIndexedDBSupported(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  // Cleanup methods
  async cleanup(): Promise<void> {
    try {
      // Remove old synced items
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

      await db.syncQueue
        .where('synced')
        .equals(true)
        .and(item => item.syncedAt < cutoffDate)
        .delete();

      await db.submissions
        .where('synced')
        .equals(true)
        .and(item => item.syncedAt < cutoffDate)
        .delete();
    } catch (error) {
      console.error('Storage cleanup error:', error);
    }
  }
}

export const storageService = new StorageService();