import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { NotificationBell } from '@/components/common/NotificationBell';

export function Header() {
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Error handled by context
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Zakat Management Platform
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <span className="text-sm text-gray-600">
              Welcome, {profile.firstName} {profile.lastName}
            </span>
          )}
          <NotificationBell />
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
