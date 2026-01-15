import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RootLayout } from './components/layout/RootLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// Lazy-loaded pages for code splitting (performance optimization)
// Public Pages - loaded immediately for faster initial load
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Applicant Pages - lazy loaded
const ApplicantDashboard = lazy(() => import('./pages/applicant/ApplicantDashboard').then(m => ({ default: m.ApplicantDashboard })));
const ApplyPage = lazy(() => import('./pages/applicant/ApplyPage').then(m => ({ default: m.ApplyPage })));
const ApplicationsPage = lazy(() => import('./pages/applicant/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })));
const ApplicationDetailPage = lazy(() => import('./pages/applicant/ApplicationDetailPage').then(m => ({ default: m.ApplicationDetailPage })));

// Admin Pages - lazy loaded
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const BootstrapPage = lazy(() => import('./pages/admin/BootstrapPage').then(m => ({ default: m.BootstrapPage })));
const ApplicationPoolPage = lazy(() => import('./pages/admin/ApplicationPoolPage').then(m => ({ default: m.ApplicationPoolPage })));
const MyApplicationsPage = lazy(() => import('./pages/admin/MyApplicationsPage').then(m => ({ default: m.MyApplicationsPage })));
const AdminApplicationDetailPage = lazy(() => import('./pages/admin/AdminApplicationDetailPage').then(m => ({ default: m.AdminApplicationDetailPage })));
const FlagManagementPage = lazy(() => import('./pages/admin/FlagManagementPage').then(m => ({ default: m.FlagManagementPage })));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

// Super Admin Pages - lazy loaded
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const MasajidListPage = lazy(() => import('./pages/super-admin/MasajidListPage').then(m => ({ default: m.MasajidListPage })));
const MasjidOnboardingPage = lazy(() => import('./pages/super-admin/MasjidOnboardingPage').then(m => ({ default: m.MasjidOnboardingPage })));
const MasjidDetailPage = lazy(() => import('./pages/super-admin/MasjidDetailPage').then(m => ({ default: m.MasjidDetailPage })));
const UserManagementPage = lazy(() => import('./pages/super-admin/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const SuperAdminApplicationsPage = lazy(() => import('./pages/super-admin/SuperAdminApplicationsPage').then(m => ({ default: m.SuperAdminApplicationsPage })));

// Error Pages
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
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
            <Route path="analytics" element={<AnalyticsDashboard />} />
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
            <Route path="analytics" element={<AnalyticsDashboard />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
