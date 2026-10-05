import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider } from './context/OrganizationContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './features/dashboard/Dashboard';
import Courses from './features/courses/Courses';
import Sessions from './features/sessions/Sessions';
import Members from './features/members/Members';
import CourseDetails from './features/courses/CourseDetails';
import SessionDetails from './features/sessions/SessionDetails';
import Invitation from './pages/Invitation';
import PublicAttend from './pages/PublicAttend';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import OrganizationDetails from './features/organization/OrganizationDetails';

import Settings from './features/settings/Settings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="skeleton w-16 h-16 rounded-full"></div></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <OrganizationProvider>{children}</OrganizationProvider>;
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* Public functional routes */}
          <Route path="/invitation/:token" element={<Invitation />} />
          <Route path="/attend/:qrToken" element={<PublicAttend />} />
          
          {/* Main App Routes */}
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="sessions/:sessionId" element={<SessionDetails />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:courseId" element={<CourseDetails />} />
            <Route path="members" element={<Members />} />
            <Route path="organization" element={<OrganizationDetails />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
