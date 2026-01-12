import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export function AdminDashboard() {
  const { profile } = useAuth();

  // Placeholder statistics
  const stats = [
    { label: 'Applications in Pool', value: '0', color: 'bg-blue-500' },
    { label: 'My Active Cases', value: '0', color: 'bg-green-500' },
    { label: 'Pending Review', value: '0', color: 'bg-yellow-500' },
    { label: 'Flagged Applicants', value: '0', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Zakat Admin Dashboard
        </h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {profile?.firstName}. Manage Zakat applications for your masjid.
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
          <CardHeader title="Application Pool" />
          <CardContent>
            <p className="text-sm text-gray-600">
              View and claim applications from the shared pool.
            </p>
            <Link to="/admin/pool" className="mt-4 block">
              <Button fullWidth>View Pool</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="My Cases" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Manage applications you've claimed for review.
            </p>
            <Link to="/admin/my-applications" className="mt-4 block">
              <Button variant="outline" fullWidth>
                View My Cases
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Masjid Settings" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Update your masjid's profile and Zakat configuration.
            </p>
            <Link to="/admin/masjid" className="mt-4 block">
              <Button variant="outline" fullWidth>
                Manage Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader
          title="Recent Activity"
          description="Latest actions in the system"
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
            <p className="mt-1 text-sm text-gray-500">
              Activity will appear here once you start processing applications.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
