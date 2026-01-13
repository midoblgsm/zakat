import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { getApplicationPool, claimApplication } from '@/services/admin';
import {
  ROUTES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '@/utils/constants';
import type { ApplicationListItem, ApplicationStatus } from '@/types/application';

const POOL_STATUSES: ApplicationStatus[] = ['submitted'];
const ALL_REVIEWABLE_STATUSES: ApplicationStatus[] = [
  'submitted',
  'under_review',
  'pending_documents',
  'pending_verification',
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
  onClaim,
  isClaimingId,
}: {
  application: ApplicationListItem;
  onClaim: (id: string) => void;
  isClaimingId: string | null;
}) {
  const submittedDate = application.submittedAt?.toDate
    ? application.submittedAt.toDate()
    : null;

  const isClaiming = isClaimingId === application.id;

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
            <Button variant="ghost" size="sm">
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
          {application.status === 'submitted' && !application.assignedTo && (
            <Button
              size="sm"
              onClick={() => onClaim(application.id)}
              loading={isClaiming}
              disabled={isClaiming}
            >
              <UserPlusIcon className="h-4 w-4 mr-1" />
              Claim
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ApplicationPoolPage() {
  const { user, profile, claims } = useAuth();
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pool' | 'all'>('pool');
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const statuses = statusFilter === 'pool' ? POOL_STATUSES : ALL_REVIEWABLE_STATUSES;
      const result = await getApplicationPool({
        status: statuses,
        search: searchTerm || undefined,
        assignedTo: statusFilter === 'pool' ? null : undefined,
      });

      setApplications(result.applications);
    } catch (err) {
      setError('Failed to load applications. Please try again.');
      console.error('Error loading applications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleClaim = async (applicationId: string) => {
    if (!user || !profile || !claims?.masjidId) {
      setError('Unable to claim application. Please try logging in again.');
      return;
    }

    try {
      setIsClaimingId(applicationId);
      setError(null);
      setClaimSuccess(null);

      await claimApplication(
        applicationId,
        user.uid,
        `${profile.firstName} ${profile.lastName}`,
        claims.masjidId
      );

      setClaimSuccess('Application claimed successfully!');

      // Remove the claimed application from the list
      setApplications((prev) =>
        prev.filter((app) => app.id !== applicationId)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to claim application'
      );
    } finally {
      setIsClaimingId(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Application Pool</h1>
        <p className="mt-1 text-gray-600">
          Review and claim applications from the shared pool
        </p>
      </div>

      {/* Alerts */}
      {claimSuccess && (
        <Alert variant="success" onClose={() => setClaimSuccess(null)}>
          {claimSuccess}
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
                  setStatusFilter(e.target.value as 'pool' | 'all')
                }
                className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="pool">Available in Pool</option>
                <option value="all">All Reviewable</option>
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

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No Applications
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {statusFilter === 'pool'
                  ? 'There are no applications in the pool right now.'
                  : 'No applications match your current filters.'}
              </p>
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
                      onClaim={handleClaim}
                      isClaimingId={isClaimingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          About the Application Pool
        </h3>
        <p className="text-sm text-blue-700">
          The pool contains submitted applications that have not been claimed by
          any administrator. When you claim an application, it becomes your
          responsibility to review and process it. You can release an
          application back to the pool if needed.
        </p>
      </div>
    </div>
  );
}
