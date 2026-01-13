import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getUserApplications } from '../../services/application';
import { ROUTES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '../../utils/constants';
import type { ZakatApplication } from '../../types/application';

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        APPLICATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  linkTo,
  buttonText,
  buttonVariant = 'primary',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  linkTo: string;
  buttonText: string;
  buttonVariant?: 'primary' | 'outline';
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
            <Link to={linkTo} className="mt-4 block">
              <Button variant={buttonVariant} size="sm">
                {buttonText}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationRow({ application }: { application: ZakatApplication }) {
  const createdDate = application.createdAt?.toDate
    ? application.createdAt.toDate()
    : new Date();

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {application.status === 'draft' ? (
            <ClockIcon className="h-8 w-8 text-gray-400" />
          ) : application.status === 'approved' || application.status === 'disbursed' ? (
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          ) : application.status === 'pending_documents' ? (
            <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
          ) : (
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {application.applicationNumber}
          </p>
          <p className="text-xs text-gray-500">
            {createdDate.toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <StatusBadge status={application.status} />
        {application.status === 'draft' ? (
          <Link to={ROUTES.APPLICANT.APPLY}>
            <Button size="sm" variant="outline">
              Continue
            </Button>
          </Link>
        ) : (
          <Link
            to={ROUTES.APPLICANT.APPLICATION_DETAIL.replace(':id', application.id)}
          >
            <Button size="sm" variant="ghost">
              View
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export function ApplicantDashboard() {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<ZakatApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;

      try {
        const apps = await getUserApplications(user.uid);
        setApplications(apps.slice(0, 5)); // Only show recent 5
      } catch (error) {
        console.error('Error loading applications:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, [user]);

  const hasDraft = applications.some((app) => app.status === 'draft');
  const pendingCount = applications.filter(
    (app) =>
      app.status === 'submitted' ||
      app.status === 'under_review' ||
      app.status === 'pending_documents' ||
      app.status === 'pending_verification'
  ).length;
  const approvedCount = applications.filter(
    (app) => app.status === 'approved' || app.status === 'disbursed'
  ).length;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">
          Assalamu Alaikum, {profile?.firstName || 'Welcome'}!
        </h1>
        <p className="mt-1 text-primary-100">
          Manage your Zakat assistance applications from your dashboard.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {applications.length}
              </p>
              <p className="text-sm text-gray-500">Total Applications</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            icon={DocumentPlusIcon}
            title="New Application"
            description="Start a new Zakat assistance application"
            linkTo={ROUTES.APPLICANT.APPLY}
            buttonText={hasDraft ? 'Continue Draft' : 'Start Application'}
          />
          <QuickActionCard
            icon={ClipboardDocumentListIcon}
            title="My Applications"
            description="View and track all your applications"
            linkTo={ROUTES.APPLICANT.APPLICATIONS}
            buttonText="View All"
            buttonVariant="outline"
          />
          <QuickActionCard
            icon={UserCircleIcon}
            title="My Profile"
            description="Update your personal information"
            linkTo={ROUTES.APPLICANT.PROFILE}
            buttonText="Edit Profile"
            buttonVariant="outline"
          />
        </div>
      </div>

      {/* Recent Applications */}
      <Card>
        <CardHeader
          title="Recent Applications"
          action={
            applications.length > 0 && (
              <Link to={ROUTES.APPLICANT.APPLICATIONS}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            )
          }
        />
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No applications yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first Zakat application.
              </p>
              <div className="mt-4">
                <Link to={ROUTES.APPLICANT.APPLY}>
                  <Button>
                    <DocumentPlusIcon className="h-5 w-5 mr-2" />
                    New Application
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {applications.map((app) => (
                <ApplicationRow key={app.id} application={app} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Need Help?
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-700">
              Application Process
            </h4>
            <p className="mt-1 text-sm text-gray-600">
              Learn about the Zakat application process, eligibility requirements,
              and what documents you need.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700">
              Contact Support
            </h4>
            <p className="mt-1 text-sm text-gray-600">
              Have questions? Email us at{' '}
              <a
                href="mailto:support@zakatplatform.org"
                className="text-primary-600 hover:text-primary-700"
              >
                support@zakatplatform.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
