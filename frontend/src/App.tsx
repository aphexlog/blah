import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import Layout from './components/Layout/Layout';
import PrivateRoute from './components/Auth/PrivateRoute';
import { useAuth } from './hooks/useAuth';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard/Dashboard'));
const Forms = React.lazy(() => import('./pages/Forms/Forms'));
const FormBuilder = React.lazy(() => import('./pages/Forms/FormBuilder'));
const FormViewer = React.lazy(() => import('./pages/Forms/FormViewer'));
const DataCollection = React.lazy(() => import('./pages/DataCollection/DataCollection'));
const DataView = React.lazy(() => import('./pages/Data/DataView'));
const Reports = React.lazy(() => import('./pages/Reports/Reports'));
const Settings = React.lazy(() => import('./pages/Settings/Settings'));
const Profile = React.lazy(() => import('./pages/Profile/Profile'));
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Register = React.lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = React.lazy(() => import('./pages/Auth/ForgotPassword'));
const OfflinePage = React.lazy(() => import('./pages/Offline/OfflinePage'));

// Loading component
const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
  >
    <CircularProgress />
  </Box>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Register />
          }
        />
        <Route
          path="/forgot-password"
          element={
            user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
          }
        />
        <Route path="/offline" element={<OfflinePage />} />

        {/* Private routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Forms */}
          <Route path="forms" element={<Forms />} />
          <Route path="forms/new" element={<FormBuilder />} />
          <Route path="forms/:id/edit" element={<FormBuilder />} />
          <Route path="forms/:id/view" element={<FormViewer />} />
          
          {/* Data Collection */}
          <Route path="collect/:formId" element={<DataCollection />} />
          <Route path="collect/:formId/:submissionId" element={<DataCollection />} />
          
          {/* Data Management */}
          <Route path="data" element={<DataView />} />
          <Route path="data/:formId" element={<DataView />} />
          
          {/* Reports */}
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:formId" element={<Reports />} />
          
          {/* Settings & Profile */}
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;