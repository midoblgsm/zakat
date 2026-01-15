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
import { ApplyPage } from './pages/applicant/ApplyPage';
import { ApplicationsPage } from './pages/applicant/ApplicationsPage';
import { ApplicationDetailPage } from './pages/applicant/ApplicationDetailPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BootstrapPage } from './pages/admin/BootstrapPage';
import { ApplicationPoolPage } from './pages/admin/ApplicationPoolPage';
import { MyApplicationsPage } from './pages/admin/MyApplicationsPage';
import { AdminApplicationDetailPage } from './pages/admin/AdminApplicationDetailPage';
import { FlagManagementPage } from './pages/admin/FlagManagementPage';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';
import { MasajidListPage } from './pages/super-admin/MasajidListPage';
import { MasjidOnboardingPage } from './pages/super-admin/MasjidOnboardingPage';
import { MasjidDetailPage } from './pages/super-admin/MasjidDetailPage';
import { UserManagementPage } from './pages/super-admin/UserManagementPage';
import { SuperAdminApplicationsPage } from './pages/super-admin/SuperAdminApplicationsPage';

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
          path="/applicant/*"
          element={
            <ProtectedRoute allowedRoles={['applicant']}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ApplicantDashboard />} />
          <Route path="apply" element={<ApplyPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['zakat_admin']}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="pool" element={<ApplicationPoolPage />} />
          <Route path="my-applications" element={<MyApplicationsPage />} />
          <Route path="applications/:id" element={<AdminApplicationDetailPage />} />
          <Route path="flags" element={<FlagManagementPage />} />
        </Route>

        {/* Super Admin routes */}
        <Route
          path="/super-admin/*"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="masajid" element={<MasajidListPage />} />
          <Route path="masajid/new" element={<MasjidOnboardingPage />} />
          <Route path="masajid/:id" element={<MasjidDetailPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="applications" element={<SuperAdminApplicationsPage />} />
          <Route path="applications/:id" element={<AdminApplicationDetailPage />} />
          <Route path="flags" element={<FlagManagementPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
