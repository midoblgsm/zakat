import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RootLayout } from './components/layout/RootLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

// Applicant Pages
import { ApplicantDashboard } from './pages/applicant/ApplicantDashboard';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BootstrapPage } from './pages/admin/BootstrapPage';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';

// Error Pages
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/bootstrap" element={<BootstrapPage />} />

        {/* Applicant routes */}
        <Route
          path="/applicant"
          element={
            <ProtectedRoute allowedRoles={['applicant']}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ApplicantDashboard />} />
          {/* More applicant routes will be added in Phase 1.4 */}
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['zakat_admin']}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          {/* More admin routes will be added in Phase 1.5 */}
        </Route>

        {/* Super Admin routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          {/* More super admin routes will be added in Phase 2 */}
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
