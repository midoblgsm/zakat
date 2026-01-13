import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  InboxIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getAdminStats } from '@/services/admin';
import { ROUTES } from '@/utils/constants';

interface AdminStats {
  poolSize: number;
  myCases: number;
  pendingReview: number;
  flaggedApplicants: number;
}

export function AdminDashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;

      try {
        const adminStats = await getAdminStats(user.uid);
        setStats(adminStats);
      } catch (error) {
        console.error('Error loading admin stats:', error);
        // Set default stats on error
        setStats({
          poolSize: 0,
          myCases: 0,
          pendingReview: 0,
          flaggedApplicants: 0,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [user]);

  const statCards = [
    {
      label: 'Applications in Pool',
      value: stats?.poolSize ?? 0,
      icon: InboxIcon,
      color: 'bg-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'My Active Cases',
      value: stats?.myCases ?? 0,
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Pending Review',
      value: stats?.pendingReview ?? 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Flagged Applicants',
      value: stats?.flaggedApplicants ?? 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
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
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} padding="sm">
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-lg ${stat.iconBg} flex items-center justify-center`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Application Pool" />
          <CardContent>
            <p className="text-sm text-gray-600">
              View and claim applications from the shared pool.
            </p>
            <Link to={ROUTES.ADMIN.POOL} className="mt-4 block">
              <Button fullWidth>
                <InboxIcon className="h-5 w-5 mr-2" />
                View Pool
                {stats && stats.poolSize > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-white/20 rounded-full">
                    {stats.poolSize}
                  </span>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="My Cases" />
          <CardContent>
            <p className="text-sm text-gray-600">
              Manage applications you've claimed for review.
            </p>
            <Link to={ROUTES.ADMIN.MY_APPLICATIONS} className="mt-4 block">
              <Button variant="outline" fullWidth>
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                View My Cases
                {stats && stats.myCases > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                    {stats.myCases}
                  </span>
                )}
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
            <Link to={ROUTES.ADMIN.MASJID} className="mt-4 block">
              <Button variant="outline" fullWidth>
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Manage Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Status Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Getting Started"
            description="Quick guide to processing applications"
          />
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Browse the Application Pool
                  </p>
                  <p className="text-sm text-gray-500">
                    View submitted applications waiting for review.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Claim an Application
                  </p>
                  <p className="text-sm text-gray-500">
                    Take ownership of an application to begin reviewing.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                  3
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Review & Process
                  </p>
                  <p className="text-sm text-gray-500">
                    Verify documents, add notes, and update the status.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                  4
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Make a Decision
                  </p>
                  <p className="text-sm text-gray-500">
                    Approve or reject the application with notes.
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Application Status Guide"
            description="Understanding the application workflow"
          />
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Submitted
                </span>
                <p className="text-sm text-gray-600">
                  New applications waiting to be claimed
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Under Review
                </span>
                <p className="text-sm text-gray-600">
                  Application is being actively reviewed
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Pending Documents
                </span>
                <p className="text-sm text-gray-600">
                  Additional documents requested from applicant
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Pending Verification
                </span>
                <p className="text-sm text-gray-600">
                  Documents need to be verified
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Approved
                </span>
                <p className="text-sm text-gray-600">
                  Application approved for Zakat assistance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Rejected
                </span>
                <p className="text-sm text-gray-600">
                  Application did not meet criteria
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
