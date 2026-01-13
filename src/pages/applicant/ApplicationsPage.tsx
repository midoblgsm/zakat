import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { getUserApplications } from '../../services/application';
import { ROUTES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '../../utils/constants';
import type { ZakatApplication } from '../../types/application';

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

function ApplicationCard({ application }: { application: ZakatApplication }) {
  const createdDate = application.createdAt?.toDate
    ? application.createdAt.toDate()
    : new Date();
  const submittedDate = application.submittedAt?.toDate
    ? application.submittedAt.toDate()
    : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium text-gray-900">
                {application.applicationNumber}
              </h3>
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {application.status === 'draft' ? (
                <>Started on {createdDate.toLocaleDateString()}</>
              ) : (
                <>
                  Submitted on{' '}
                  {submittedDate
                    ? submittedDate.toLocaleDateString()
                    : createdDate.toLocaleDateString()}
                </>
              )}
            </p>
            {application.zakatRequest && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">
                  ${application.zakatRequest.amountRequested.toLocaleString()}
                </span>{' '}
                {application.zakatRequest.assistanceType === 'monthly'
                  ? `per month for ${application.zakatRequest.monthlyDuration} months`
                  : '(one-time)'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {application.status === 'draft' ? (
              <Link to={ROUTES.APPLICANT.APPLY}>
                <Button size="sm">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Continue
                </Button>
              </Link>
            ) : (
              <Link
                to={ROUTES.APPLICANT.APPLICATION_DETAIL.replace(
                  ':id',
                  application.id
                )}
              >
                <Button variant="outline" size="sm">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Status-specific messages */}
        {application.status === 'pending_documents' && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800">
              Additional documents are required. Please check your email for details.
            </p>
          </div>
        )}

        {application.status === 'approved' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              Your application has been approved! Please check your email for
              next steps.
            </p>
          </div>
        )}

        {application.status === 'rejected' && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              Unfortunately, your application was not approved. You may apply
              again after 6 months.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ApplicationsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [applications, setApplications] = useState<ZakatApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showSubmittedAlert = location.state?.submitted;

  useEffect(() => {
    async function loadApplications() {
      if (!user) return;

      try {
        const apps = await getUserApplications(user.uid);
        setApplications(apps);
      } catch (err) {
        setError('Failed to load applications. Please try again.');
        console.error('Error loading applications:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, [user]);

  const hasDraft = applications.some((app) => app.status === 'draft');
  const submittedApplications = applications.filter(
    (app) => app.status !== 'draft'
  );
  const draftApplications = applications.filter((app) => app.status === 'draft');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
            <p className="mt-1 text-sm text-gray-600">
              View and manage your Zakat assistance applications
            </p>
          </div>
          {!hasDraft && (
            <Link to={ROUTES.APPLICANT.APPLY}>
              <Button>
                <PlusIcon className="h-5 w-5 mr-2" />
                New Application
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showSubmittedAlert && (
        <Alert variant="success" className="mb-6">
          Your application has been submitted successfully! You will receive
          email updates as it is reviewed.
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ClockIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Applications Yet
            </h3>
            <p className="text-gray-600 mb-6">
              You haven't started any Zakat assistance applications yet.
            </p>
            <Link to={ROUTES.APPLICANT.APPLY}>
              <Button>
                <PlusIcon className="h-5 w-5 mr-2" />
                Start New Application
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Draft Applications */}
          {draftApplications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Draft Applications
              </h2>
              <div className="space-y-4">
                {draftApplications.map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            </div>
          )}

          {/* Submitted Applications */}
          {submittedApplications.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Submitted Applications
              </h2>
              <div className="space-y-4">
                {submittedApplications.map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help section */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Need Help?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900">Application Status Guide</h4>
            <ul className="mt-2 space-y-1">
              <li><strong>Draft:</strong> Application in progress, not yet submitted</li>
              <li><strong>Submitted:</strong> Awaiting initial review</li>
              <li><strong>Under Review:</strong> Being actively reviewed</li>
              <li><strong>Pending Documents:</strong> Additional documents needed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Contact Support</h4>
            <p className="mt-2">
              If you have questions about your application or need assistance,
              please contact us at support@zakatplatform.org
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
