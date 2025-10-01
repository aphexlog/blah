import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as FormsIcon,
  Storage as DataIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
  SmartToy as AIIcon,
  RecordVoiceOver as VoiceIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { UserRole, NavigationItem } from '../../types';

interface NavigationProps {
  onNavigate?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const navigationItems: NavigationItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
    },
    {
      path: '/forms',
      label: 'Forms',
      icon: 'forms',
      roles: [UserRole.ADMIN, UserRole.RESEARCHER],
    },
    {
      path: '/data',
      label: 'Data',
      icon: 'data',
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: 'reports',
      roles: [UserRole.ADMIN, UserRole.RESEARCHER, UserRole.VIEWER],
    },
  ];

  const settingsItems: NavigationItem[] = [
    {
      path: '/settings',
      label: 'Settings',
      icon: 'settings',
      roles: [UserRole.ADMIN],
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: 'profile',
    },
  ];

  const getIcon = (iconName: string) => {
    const iconMap = {
      dashboard: <DashboardIcon />,
      forms: <FormsIcon />,
      data: <DataIcon />,
      reports: <ReportsIcon />,
      settings: <SettingsIcon />,
      profile: <ProfileIcon />,
      ai: <AIIcon />,
      voice: <VoiceIcon />,
    };
    return iconMap[iconName as keyof typeof iconMap] || <DashboardIcon />;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const isItemVisible = (item: NavigationItem) => {
    if (!item.roles || !user) return true;
    return item.roles.includes(user.role);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            mb: 1,
          }}
        >
          NextGen EDC
        </Typography>
        <Typography variant="body2" color="text.secondary">
          AI-Powered Data Capture
        </Typography>
      </Box>

      <Divider />

      {/* User Info */}
      {user && (
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user.firstName} {user.lastName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={user.role.replace('_', ' ')}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>
      )}

      <Divider />

      {/* Main Navigation */}
      <List sx={{ flexGrow: 1, py: 1 }}>
        {navigationItems
          .filter(isItemVisible)
          .map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getIcon(item.icon)}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
      </List>

      <Divider />

      {/* AI Features Section */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, mb: 1 }}
        >
          AI Features
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            icon={<AIIcon />}
            label="Smart Validation"
            size="small"
            variant="outlined"
            color="secondary"
          />
          <Chip
            icon={<VoiceIcon />}
            label="Voice Input"
            size="small"
            variant="outlined"
            color="secondary"
          />
        </Box>
      </Box>

      <Divider />

      {/* Settings Navigation */}
      <List sx={{ py: 1 }}>
        {settingsItems
          .filter(isItemVisible)
          .map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getIcon(item.icon)}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );
};

export default Navigation;