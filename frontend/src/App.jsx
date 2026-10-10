import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
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
import MyAttendance from './features/attendance/MyAttendance';
import Invitation from './pages/Invitation';
import PublicAttend from './pages/PublicAttend';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import OrganizationDetails from './features/organization/OrganizationDetails';
import Settings from './features/settings/Settings';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen min-h-[100dvh] bg-[#0c2b27] text-slate-200">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-emerald-200/80 tracking-wide">Loading Attendance Shield...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { loading: authLoading } = useAuth();
  const { activeOrganization, loadingOrg } = useOrganization();
  
  if (authLoading || loadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!activeOrganization) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeOrganization.userRole)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
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
            <Route path="sessions" element={<RoleRoute allowedRoles={['OWNER', 'ADMIN', 'INSTRUCTOR']}><Sessions /></RoleRoute>} />
            <Route path="sessions/:sessionId" element={<RoleRoute allowedRoles={['OWNER', 'ADMIN', 'INSTRUCTOR']}><SessionDetails /></RoleRoute>} />
            <Route path="courses" element={<RoleRoute allowedRoles={['OWNER', 'ADMIN', 'INSTRUCTOR', 'ATTENDEE']}><Courses /></RoleRoute>} />
            <Route path="courses/:courseId" element={<RoleRoute allowedRoles={['OWNER', 'ADMIN', 'INSTRUCTOR', 'ATTENDEE']}><CourseDetails /></RoleRoute>} />
            <Route path="attendance" element={<RoleRoute allowedRoles={['ATTENDEE', 'OWNER', 'INSTRUCTOR']}><MyAttendance /></RoleRoute>} />
            <Route path="members" element={<RoleRoute allowedRoles={['OWNER', 'ADMIN', 'INSTRUCTOR']}><Members /></RoleRoute>} />
            <Route path="organization" element={<OrganizationDetails />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </Router>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;
