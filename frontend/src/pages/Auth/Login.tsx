import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../contexts/NotificationContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { login, loading, error } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
      showSuccess('Login successful', 'Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Login failed', 'Authentication Error');
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'researcher' | 'collector') => {
    const demoCredentials = {
      admin: { email: 'admin@demo.com', password: 'demo123456' },
      researcher: { email: 'researcher@demo.com', password: 'demo123456' },
      collector: { email: 'collector@demo.com', password: 'demo123456' }
    };

    const { email: demoEmail, password: demoPassword } = demoCredentials[role];
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      await login(demoEmail, demoPassword);
      showSuccess(`Demo login successful as ${role}`, 'Welcome to NextGen EDC!');
      navigate('/dashboard');
    } catch (err: any) {
      showError('Demo login failed. Please use the registration form.', 'Demo Login Error');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '80vh',
          justifyContent: 'center',
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 400,
            boxShadow: 3,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 1,
                }}
              >
                NextGen EDC
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Electronic Data Capture System
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In'
                )}
              </Button>

              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Link
                  to="/forgot-password"
                  style={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    style={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </Box>

            {/* Demo Login Section */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', mb: 2 }}
              >
                Try the demo:
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleDemoLogin('admin')}
                  disabled={loading}
                  fullWidth={isMobile}
                >
                  Admin Demo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleDemoLogin('researcher')}
                  disabled={loading}
                  fullWidth={isMobile}
                >
                  Researcher Demo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleDemoLogin('collector')}
                  disabled={loading}
                  fullWidth={isMobile}
                >
                  Collector Demo
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © 2024 NextGen EDC. Advanced Electronic Data Capture.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;