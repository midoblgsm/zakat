import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireEmailVerified?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireEmailVerified = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isEmailVerified, userRole, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to verify email page if email not verified
  if (requireEmailVerified && !isEmailVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0 && userRole) {
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate dashboard based on role
      const dashboardPaths: Record<UserRole, string> = {
        applicant: '/applicant',
        zakat_admin: '/admin',
        super_admin: '/super-admin',
      };
      return <Navigate to={dashboardPaths[userRole]} replace />;
    }
  }

  return <>{children}</>;
}
