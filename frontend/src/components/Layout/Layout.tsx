import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Description as FormsIcon,
  Storage as DataIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

import Navigation from './Navigation';
import UserMenu from './UserMenu';
import { useOffline } from '../../contexts/OfflineContext';
import { useAuth } from '../../hooks/useAuth';

const drawerWidth = 280;

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { user } = useAuth();
  const { isOnline, pendingChanges, syncInProgress, syncData } = useOffline();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSync = async () => {
    try {
      await syncData();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            NextGen EDC
          </Typography>

          {/* Offline Indicator */}
          {!isOnline && (
            <Chip
              icon={<OfflineIcon />}
              label="Offline"
              size="small"
              color="warning"
              sx={{ mr: 2 }}
            />
          )}

          {/* Pending Changes Indicator */}
          {pendingChanges > 0 && (
            <Badge badgeContent={pendingChanges} color="error" sx={{ mr: 2 }}>
              <IconButton
                color="inherit"
                onClick={handleSync}
                disabled={syncInProgress || !isOnline}
                title={`${pendingChanges} pending changes`}
              >
                <SyncIcon className={syncInProgress ? 'voice-recording' : ''} />
              </IconButton>
            </Badge>
          )}

          <UserMenu />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          <Navigation onNavigate={() => setMobileOpen(false)} />
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          <Navigation />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;