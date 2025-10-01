import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { OfflineState } from '../types';
import { storageService } from '../services/storageService';

interface OfflineContextType extends OfflineState {
  goOnline: () => void;
  goOffline: () => void;
  syncData: () => Promise<void>;
  addOfflineAction: (action: string, data: any) => Promise<void>;
}

type OfflineAction =
  | { type: 'GO_ONLINE' }
  | { type: 'GO_OFFLINE' }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_SUCCESS'; payload: { lastSync: Date; pendingChanges: number } }
  | { type: 'SYNC_FAILURE' }
  | { type: 'ADD_PENDING_CHANGE' }
  | { type: 'REMOVE_PENDING_CHANGE' };

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const offlineReducer = (state: OfflineState, action: OfflineAction): OfflineState => {
  switch (action.type) {
    case 'GO_ONLINE':
      return {
        ...state,
        isOnline: true,
      };
    case 'GO_OFFLINE':
      return {
        ...state,
        isOnline: false,
      };
    case 'SYNC_START':
      return {
        ...state,
        syncInProgress: true,
      };
    case 'SYNC_SUCCESS':
      return {
        ...state,
        syncInProgress: false,
        lastSync: action.payload.lastSync,
        pendingChanges: action.payload.pendingChanges,
      };
    case 'SYNC_FAILURE':
      return {
        ...state,
        syncInProgress: false,
      };
    case 'ADD_PENDING_CHANGE':
      return {
        ...state,
        pendingChanges: state.pendingChanges + 1,
      };
    case 'REMOVE_PENDING_CHANGE':
      return {
        ...state,
        pendingChanges: Math.max(0, state.pendingChanges - 1),
      };
    default:
      return state;
  }
};

const initialState: OfflineState = {
  isOnline: navigator.onLine,
  lastSync: null,
  pendingChanges: 0,
  syncInProgress: false,
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(offlineReducer, initialState);

  useEffect(() => {
    // Initialize offline state
    const initOfflineState = async () => {
      try {
        const lastSync = await storageService.getItem('lastSync');
        const syncQueue = await storageService.getSyncQueue();
        
        if (lastSync) {
          dispatch({
            type: 'SYNC_SUCCESS',
            payload: {
              lastSync: new Date(lastSync),
              pendingChanges: syncQueue.length,
            },
          });
        } else {
          dispatch({
            type: 'SYNC_SUCCESS',
            payload: {
              lastSync: new Date(),
              pendingChanges: syncQueue.length,
            },
          });
        }
      } catch (error) {
        console.error('Failed to initialize offline state:', error);
      }
    };

    initOfflineState();

    // Listen for online/offline events
    const handleOnline = () => {
      dispatch({ type: 'GO_ONLINE' });
      // Auto-sync when coming online
      syncData();
    };

    const handleOffline = () => {
      dispatch({ type: 'GO_OFFLINE' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const goOnline = () => {
    dispatch({ type: 'GO_ONLINE' });
  };

  const goOffline = () => {
    dispatch({ type: 'GO_OFFLINE' });
  };

  const syncData = async (): Promise<void> => {
    if (!state.isOnline || state.syncInProgress) {
      return;
    }

    dispatch({ type: 'SYNC_START' });

    try {
      // Get pending sync items
      const syncQueue = await storageService.getSyncQueue();
      const unsyncedSubmissions = await storageService.getUnsyncedSubmissions();

      // Sync submissions first
      for (const submission of unsyncedSubmissions) {
        try {
          // In a real implementation, this would call the API
          console.log('Syncing submission:', submission.id);
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await storageService.markSubmissionSynced(submission.id);
          dispatch({ type: 'REMOVE_PENDING_CHANGE' });
        } catch (error) {
          console.error('Failed to sync submission:', submission.id, error);
          // Continue with other submissions
        }
      }

      // Sync other queued actions
      for (const item of syncQueue) {
        try {
          console.log('Syncing action:', item.action);
          
          // Simulate API call based on action type
          await new Promise(resolve => setTimeout(resolve, 50));
          
          await storageService.markSyncQueueItemSynced(item.id);
          dispatch({ type: 'REMOVE_PENDING_CHANGE' });
        } catch (error) {
          console.error('Failed to sync action:', item.action, error);
          // Continue with other actions
        }
      }

      // Update last sync time
      const now = new Date();
      await storageService.setItem('lastSync', now.toISOString());

      const remainingPendingChanges = await storageService.getSyncQueue();
      
      dispatch({
        type: 'SYNC_SUCCESS',
        payload: {
          lastSync: now,
          pendingChanges: remainingPendingChanges.length,
        },
      });
    } catch (error) {
      console.error('Sync failed:', error);
      dispatch({ type: 'SYNC_FAILURE' });
      throw error;
    }
  };

  const addOfflineAction = async (action: string, data: any): Promise<void> => {
    await storageService.addToSyncQueue(action, data);
    dispatch({ type: 'ADD_PENDING_CHANGE' });
  };

  const value: OfflineContextType = {
    ...state,
    goOnline,
    goOffline,
    syncData,
    addOfflineAction,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};