import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Snackbar, Alert, AlertTitle, Button, Box } from '@mui/material';
import { NotificationMessage } from '../types';

interface NotificationState {
  notifications: NotificationMessage[];
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: NotificationMessage }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' };

interface NotificationContextType {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      };
    default:
      return state;
  }
};

const initialState: NotificationState = {
  notifications: [],
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = (notification: Omit<NotificationMessage, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: NotificationMessage = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const showSuccess = (message: string, title?: string) => {
    addNotification({
      type: 'success',
      title: title || 'Success',
      message,
    });
  };

  const showError = (message: string, title?: string) => {
    addNotification({
      type: 'error',
      title: title || 'Error',
      message,
      duration: 0, // Don't auto-dismiss errors
    });
  };

  const showWarning = (message: string, title?: string) => {
    addNotification({
      type: 'warning',
      title: title || 'Warning',
      message,
    });
  };

  const showInfo = (message: string, title?: string) => {
    addNotification({
      type: 'info',
      title: title || 'Information',
      message,
    });
  };

  const value: NotificationContextType = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: 400,
        }}
      >
        {state.notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={true}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert
              severity={notification.type}
              onClose={() => removeNotification(notification.id)}
              variant="filled"
              sx={{ width: '100%' }}
              action={
                notification.actions && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        color="inherit"
                        size="small"
                        onClick={() => {
                          action.action();
                          removeNotification(notification.id);
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Box>
                )
              }
            >
              <AlertTitle>{notification.title}</AlertTitle>
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};