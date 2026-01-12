import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export function SuperAdminDashboard() {
  const { profile } = useAuth();

  // Placeholder statistics
  const stats = [
    { label: 'Total Masajid', value: '0', color: 'bg-primary-500' },
    { label: 'Total Users', value: '0', color: 'bg-blue-500' },
    { label: 'Active Applications', value: '0', color: 'bg-green-500' },
    { label: 'Active Flags', value: '0', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {profile?.firstName}. Manage the entire Zakat platform.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <span className="text-xl font-bold text-white">{stat.value}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Masajid Management" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Onboard new masajid and manage existing ones.
            </p>
            <Link to="/super-admin/masajid" className="mt-4 block">
              <Button fullWidth>Manage Masajid</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="User Management" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Manage users and assign admin roles.
            </p>
            <Link to="/super-admin/users" className="mt-4 block">
              <Button variant="outline" fullWidth>
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Flag Management" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Review and manage flagged applicants across all masajid.
            </p>
            <Link to="/super-admin/flags" className="mt-4 block">
              <Button variant="outline" fullWidth>
                View Flags
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* System Overview Placeholder */}
      <Card>
        <CardHeader
          title="System Overview"
          description="Platform-wide statistics and metrics"
        />
        <CardContent>
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Statistics will appear here once the platform has activity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
