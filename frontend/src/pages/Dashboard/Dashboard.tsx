import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as FormsIcon,
  Storage as DataIcon,
  TrendingUp as TrendingIcon,
  SmartToy as AIIcon,
  RecordVoiceOver as VoiceIcon,
  CloudOff as OfflineIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

import { useAuth } from '../../hooks/useAuth';
import { useOffline } from '../../contexts/OfflineContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, pendingChanges, lastSync, syncData } = useOffline();

  const statsCards = [
    {
      title: 'Active Forms',
      value: '12',
      change: '+2 this month',
      icon: <FormsIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
    },
    {
      title: 'Data Entries',
      value: '1,247',
      change: '+18% this week',
      icon: <DataIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
    },
    {
      title: 'AI Validations',
      value: '98.5%',
      change: 'Accuracy rate',
      icon: <AIIcon sx={{ fontSize: 40 }} />,
      color: 'secondary.main',
    },
    {
      title: 'Voice Entries',
      value: '324',
      change: '+42% adoption',
      icon: <VoiceIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
    },
  ];

  const handleSync = async () => {
    try {
      await syncData();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your data collection today.
        </Typography>
      </Box>

      {/* Connection Status */}
      <Card sx={{ mb: 3, bgcolor: isOnline ? 'success.light' : 'warning.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isOnline ? (
                <>
                  <SyncIcon color="success" />
                  <Typography variant="h6" color="success.dark">
                    Online & Synced
                  </Typography>
                </>
              ) : (
                <>
                  <OfflineIcon color="warning" />
                  <Typography variant="h6" color="warning.dark">
                    Working Offline
                  </Typography>
                </>
              )}
              
              {pendingChanges > 0 && (
                <Chip
                  label={`${pendingChanges} pending changes`}
                  size="small"
                  color={isOnline ? 'warning' : 'error'}
                />
              )}
            </Box>

            {isOnline && pendingChanges > 0 && (
              <Button
                variant="contained"
                size="small"
                onClick={handleSync}
                startIcon={<SyncIcon />}
              >
                Sync Now
              </Button>
            )}
          </Box>
          
          {lastSync && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Last sync: {new Date(lastSync).toLocaleString()}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.change}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Recent Activity
              </Typography>
              
              <Box sx={{ space: 2 }}>
                {[
                  {
                    title: 'Patient Survey Form submitted',
                    time: '2 minutes ago',
                    type: 'submission',
                  },
                  {
                    title: 'AI validation completed for Clinical Trial Data',
                    time: '5 minutes ago',
                    type: 'validation',
                  },
                  {
                    title: 'Voice entry processed for Field Research',
                    time: '12 minutes ago',
                    type: 'voice',
                  },
                  {
                    title: 'New form "Lab Results" created',
                    time: '1 hour ago',
                    type: 'form',
                  },
                ].map((activity, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < 3 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        mr: 2,
                      }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">{activity.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                System Health
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Data Quality</Typography>
                  <Typography variant="body2" color="success.main">98.5%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={98.5} color="success" />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Storage Used</Typography>
                  <Typography variant="body2" color="warning.main">73%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={73} color="warning" />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">AI Performance</Typography>
                  <Typography variant="body2" color="success.main">95.2%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={95.2} color="success" />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Voice Recognition</Typography>
                  <Typography variant="body2" color="info.main">91.8%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={91.8} color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Insights */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            AI-Generated Insights
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Data Quality Alert
                </Typography>
                <Typography variant="body2">
                  Recent submissions show 12% improvement in completion rates after voice input integration.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Usage Pattern
                </Typography>
                <Typography variant="body2">
                  Peak data entry hours: 10-11 AM and 2-3 PM. Consider automated reminders for optimal times.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Recommendation
                </Typography>
                <Typography variant="body2">
                  Enable multilingual voice input for 23% of users who prefer non-English data entry.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;