import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  InboxIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { getMyApplications, releaseApplication } from '@/services/admin';
import {
  ROUTES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '@/utils/constants';
import type { ApplicationListItem, ApplicationStatus } from '@/types/application';

const CASE_STATUSES: ApplicationStatus[] = [
  'under_review',
  'pending_documents',
  'pending_verification',
  'approved',
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        APPLICATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}

function ApplicationRow({
  application,
  onRelease,
  isReleasingId,
}: {
  application: ApplicationListItem;
  onRelease: (id: string) => void;
  isReleasingId: string | null;
}) {
  const submittedDate = application.submittedAt?.toDate
    ? application.submittedAt.toDate()
    : null;

  const isReleasing = isReleasingId === application.id;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {application.applicantSnapshot.name}
            </div>
            <div className="text-sm text-gray-500">
              {application.applicationNumber}
            </div>
          </div>
          {application.applicantSnapshot.isFlagged && (
            <ExclamationTriangleIcon
              className="ml-2 h-5 w-5 text-red-500"
              title="Flagged applicant"
            />
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          ${application.zakatRequest.amountRequested.toLocaleString()}
        </div>
        <div className="text-sm text-gray-500">
          {application.zakatRequest.assistanceType === 'monthly'
            ? 'Monthly'
            : 'One-time'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={application.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {submittedDate ? submittedDate.toLocaleDateString() : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <Link
            to={ROUTES.ADMIN.APPLICATION_DETAIL.replace(':id', application.id)}
          >
            <Button size="sm">
              <EyeIcon className="h-4 w-4 mr-1" />
              {application.status === 'approved' ? 'View' : 'Review'}
            </Button>
          </Link>
          {application.status !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRelease(application.id)}
              loading={isReleasing}
              disabled={isReleasing}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Release
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function MyApplicationsPage() {
  const { user, profile, claims } = useAuth();
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>(
    'all'
  );
  const [isReleasingId, setIsReleasingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const statuses =
        statusFilter === 'all' ? CASE_STATUSES : [statusFilter];
      const result = await getMyApplications(user.uid, {
        status: statuses,
        search: searchTerm || undefined,
      });

      setApplications(result.applications);
    } catch (err) {
      setError('Failed to load applications. Please try again.');
      console.error('Error loading applications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, statusFilter, searchTerm]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleRelease = async (applicationId: string) => {
    if (!user || !profile || !claims?.masjidId) {
      setError('Unable to release application. Please try logging in again.');
      return;
    }

    try {
      setIsReleasingId(applicationId);
      setError(null);
      setSuccessMessage(null);

      await releaseApplication(
        applicationId,
        user.uid,
        `${profile.firstName} ${profile.lastName}`,
        claims.masjidId
      );

      setSuccessMessage('Application released back to the pool.');

      // Remove the released application from the list
      setApplications((prev) =>
        prev.filter((app) => app.id !== applicationId)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to release application'
      );
    } finally {
      setIsReleasingId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadApplications();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
        <p className="mt-1 text-gray-600">
          Applications you've claimed for review
        </p>
      </div>

      {/* Alerts */}
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or application number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border border-gray-300 py-2 pr-4 text-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ApplicationStatus | 'all')
                }
                className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Cases</option>
                <option value="under_review">Under Review</option>
                <option value="pending_documents">Pending Documents</option>
                <option value="pending_verification">
                  Pending Verification
                </option>
                <option value="approved">Approved</option>
              </select>
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              onClick={() => loadApplications()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Under Review</p>
              <p className="text-lg font-semibold text-gray-900">
                {applications.filter((a) => a.status === 'under_review').length}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <InboxIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Documents</p>
              <p className="text-lg font-semibold text-gray-900">
                {
                  applications.filter((a) => a.status === 'pending_documents')
                    .length
                }
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <MagnifyingGlassIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Verification</p>
              <p className="text-lg font-semibold text-gray-900">
                {
                  applications.filter(
                    (a) => a.status === 'pending_verification'
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-lg font-semibold text-gray-900">
                {applications.filter((a) => a.status === 'approved').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center">
              <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Active Cases
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                You don't have any applications assigned to you.
              </p>
              <div className="mt-6">
                <Link to={ROUTES.ADMIN.POOL}>
                  <Button>Browse Application Pool</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Applicant
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Request
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Submitted
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      onRelease={handleRelease}
                      isReleasingId={isReleasingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
