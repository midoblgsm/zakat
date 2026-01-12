import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export function ApplicantDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.firstName}!
        </h1>
        <p className="mt-1 text-gray-600">
          Manage your Zakat applications from your dashboard.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="New Application" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Start a new Zakat application to request assistance.
            </p>
            <Link to="/applicant/apply" className="mt-4 block">
              <Button fullWidth>Start Application</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="My Applications" />
          <CardContent>
            <p className="text-sm text-gray-600">
              View and track the status of your submitted applications.
            </p>
            <Link to="/applicant/applications" className="mt-4 block">
              <Button variant="outline" fullWidth>
                View Applications
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Profile" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Update your personal information and contact details.
            </p>
            <Link to="/applicant/profile" className="mt-4 block">
              <Button variant="outline" fullWidth>
                Edit Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications Placeholder */}
      <Card>
        <CardHeader
          title="Recent Applications"
          description="Your most recent Zakat applications"
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first Zakat application.
            </p>
            <div className="mt-4">
              <Link to="/applicant/apply">
                <Button>New Application</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
