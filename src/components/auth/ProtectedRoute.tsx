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

  console.log('[ProtectedRoute] Checking access for:', location.pathname);
  console.log('[ProtectedRoute] State:', { loading, isAuthenticated, isEmailVerified, userRole, allowedRoles });

  // Show loading state while checking auth
  if (loading) {
    console.log('[ProtectedRoute] Still loading...');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to verify email page if email not verified
  if (requireEmailVerified && !isEmailVerified) {
    console.log('[ProtectedRoute] Email not verified, redirecting to verify-email');
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
      console.log(`[ProtectedRoute] Role '${userRole}' not in allowed roles [${allowedRoles.join(', ')}], redirecting to ${dashboardPaths[userRole]}`);
      return <Navigate to={dashboardPaths[userRole]} replace />;
    }
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
}
