import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ApplicationTimeline } from '../../components/application/ApplicationTimeline';
import { DocumentUploadSection } from '../../components/application/DocumentUploadSection';
import { useAuth } from '../../contexts/AuthContext';
import { getApplication, getApplicationHistory } from '../../services/application';
import { ROUTES, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from '../../utils/constants';
import type { ZakatApplication, ApplicationHistoryEntry } from '../../types/application';

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        APPLICATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
    case 'disbursed':
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    case 'rejected':
      return <XCircleIcon className="h-6 w-6 text-red-500" />;
    case 'pending_documents':
    case 'pending_verification':
      return <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />;
    default:
      return <ClockIcon className="h-6 w-6 text-blue-500" />;
  }
}

function getStatusDescription(status: string): string {
  switch (status) {
    case 'draft':
      return 'Your application is saved as a draft. Continue editing to submit.';
    case 'submitted':
      return 'Your application has been submitted and is waiting to be reviewed.';
    case 'under_review':
      return 'A reviewer is currently evaluating your application.';
    case 'pending_documents':
      return 'Additional documents are needed. Please check your email for details.';
    case 'pending_verification':
      return 'Your information is being verified. This may take a few days.';
    case 'approved':
      return 'Congratulations! Your application has been approved.';
    case 'rejected':
      return 'Unfortunately, your application was not approved at this time.';
    case 'disbursed':
      return 'Funds have been disbursed according to your approved application.';
    case 'closed':
      return 'This application has been closed.';
    default:
      return 'Status information not available.';
  }
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  let displayValue = value;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (value === undefined || value === null || value === '') {
    displayValue = 'Not provided';
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">
        {String(displayValue)}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-6">
      <CardHeader title={title} />
      <CardContent>
        <dl>{children}</dl>
      </CardContent>
    </Card>
  );
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [application, setApplication] = useState<ZakatApplication | null>(null);
  const [history, setHistory] = useState<ApplicationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    if (!id || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      const [app, hist] = await Promise.all([
        getApplication(id),
        getApplicationHistory(id),
      ]);

      if (!app) {
        setError('Application not found');
        return;
      }

      // Verify ownership
      if (app.applicantId !== user.uid) {
        setError('You do not have permission to view this application');
        return;
      }

      setApplication(app);
      setHistory(hist);
    } catch (err) {
      setError('Failed to load application. Please try again.');
      console.error('Error loading application:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Alert variant="error">{error || 'Application not found'}</Alert>
        <div className="mt-4">
          <Link to={ROUTES.APPLICANT.APPLICATIONS}>
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const submittedDate = application.submittedAt?.toDate
    ? application.submittedAt.toDate()
    : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={ROUTES.APPLICANT.APPLICATIONS}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Applications
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              {getStatusIcon(application.status)}
              <h1 className="text-2xl font-bold text-gray-900">
                {application.applicationNumber}
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {submittedDate
                ? `Submitted on ${submittedDate.toLocaleDateString()}`
                : 'Draft application'}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 p-3 rounded-full ${
                application.status === 'approved' || application.status === 'disbursed'
                  ? 'bg-green-100'
                  : application.status === 'rejected'
                  ? 'bg-red-100'
                  : application.status === 'pending_documents' ||
                    application.status === 'pending_verification'
                  ? 'bg-amber-100'
                  : 'bg-blue-100'
              }`}
            >
              {getStatusIcon(application.status)}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {APPLICATION_STATUS_LABELS[application.status] || application.status}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {getStatusDescription(application.status)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status-specific alerts */}
      {application.status === 'pending_documents' && (
        <Alert variant="warning" className="mb-6">
          <strong>Action Required:</strong> Additional documents are needed to
          process your application. Please upload the requested documents below.
        </Alert>
      )}

      {/* Document Upload Section - shown when there are pending document requests */}
      {['pending_documents', 'under_review', 'pending_verification'].includes(
        application.status
      ) && (
        <DocumentUploadSection
          applicationId={application.id}
          onUploadComplete={loadApplication}
        />
      )}

      {application.status === 'approved' && application.resolution && (
        <Alert variant="success" className="mb-6">
          <strong>Approved!</strong> Your application has been approved for $
          {application.resolution.amountApproved?.toLocaleString()}. Please
          check your email for disbursement details.
        </Alert>
      )}

      {application.status === 'rejected' && application.resolution && (
        <Alert variant="error" className="mb-6">
          <strong>Application Not Approved:</strong>{' '}
          {application.resolution.rejectionReason ||
            'Your application did not meet the eligibility criteria. You may reapply after 6 months.'}
        </Alert>
      )}

      {/* Application Timeline */}
      {history.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Application Timeline"
            description="Track the progress of your application"
          />
          <CardContent>
            <ApplicationTimeline
              history={history}
              showDetailed={false}
              maxItems={10}
            />
          </CardContent>
        </Card>
      )}

      {/* Request Summary */}
      <Section title="Request Summary">
        <InfoRow
          label="Assistance Type"
          value={
            application.zakatRequest?.assistanceType === 'monthly'
              ? 'Monthly Assistance'
              : 'One-Time Assistance'
          }
        />
        <InfoRow
          label="Amount Requested"
          value={`$${application.zakatRequest?.amountRequested?.toLocaleString() || 0}`}
        />
        {application.zakatRequest?.assistanceType === 'monthly' && (
          <InfoRow
            label="Duration"
            value={`${application.zakatRequest?.monthlyDuration || 0} months`}
          />
        )}
        <InfoRow
          label="Reason for Application"
          value={application.zakatRequest?.reasonForApplication}
        />
      </Section>

      {/* Personal Information */}
      <Section title="Personal Information">
        <InfoRow label="Full Name" value={application.demographics?.fullName} />
        <InfoRow label="Age" value={application.demographics?.age} />
        <InfoRow label="Gender" value={application.demographics?.gender} />
        <InfoRow
          label="Marital Status"
          value={application.demographics?.maritalStatus}
        />
        <InfoRow
          label="Primary Language"
          value={application.demographics?.primaryLanguage}
        />
      </Section>

      {/* Contact Information */}
      <Section title="Contact Information">
        <InfoRow
          label="Address"
          value={
            application.contact?.address
              ? `${application.contact.address.street}, ${application.contact.address.city}, ${application.contact.address.state} ${application.contact.address.zipCode}`
              : null
          }
        />
        <InfoRow label="Phone" value={application.contact?.phone} />
        <InfoRow label="Email" value={application.contact?.email} />
      </Section>

      {/* Household */}
      <Section title="Household Information">
        <InfoRow
          label="Household Members"
          value={application.household?.length || 0}
        />
        {application.household && application.household.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Members:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {application.household.map((member, index) => (
                <li key={index}>
                  {member.name} ({member.age} years, {member.relationship})
                  {member.isDependent && ' - Dependent'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Financial Information */}
      <Section title="Financial Information">
        <InfoRow
          label="Monthly Income"
          value={`$${application.financial?.monthlyIncome?.toLocaleString() || 0}`}
        />
        <InfoRow
          label="Income Source"
          value={application.financial?.incomeSource}
        />
        <InfoRow
          label="Receives Government Aid"
          value={application.financial?.receivesGovernmentAid}
        />
        <InfoRow
          label="Total Assets"
          value={`$${application.financial?.assets?.totalValue?.toLocaleString() || 0}`}
        />
        <InfoRow
          label="Total Debt"
          value={`$${application.financial?.totalDebt?.toLocaleString() || 0}`}
        />
      </Section>

      {/* Circumstances */}
      <Section title="Living Circumstances">
        <InfoRow
          label="Residence Type"
          value={application.circumstances?.residenceType}
        />
        <InfoRow
          label="Monthly Rent"
          value={
            application.circumstances?.rentAmount
              ? `$${application.circumstances.rentAmount.toLocaleString()}`
              : 'N/A'
          }
        />
        <InfoRow
          label="Transportation"
          value={application.circumstances?.transportationType}
        />
        <InfoRow
          label="Employment Status"
          value={application.circumstances?.employmentStatus}
        />
        <InfoRow
          label="Health Insurance"
          value={application.circumstances?.hasHealthInsurance}
        />
        <InfoRow
          label="Education Level"
          value={application.circumstances?.educationLevel}
        />
      </Section>

      {/* Documents */}
      <Section title="Documents">
        <div className="space-y-3">
          {application.documents?.photoId && (
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700">
                Photo ID - {application.documents.photoId.fileName}
              </span>
              {application.documents.photoId.verified ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  Verified
                </span>
              ) : (
                <span className="text-xs text-amber-600">Pending verification</span>
              )}
            </div>
          )}
          {application.documents?.ssnCard && (
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700">
                SSN Card - {application.documents.ssnCard.fileName}
              </span>
              {application.documents.ssnCard.verified ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  Verified
                </span>
              ) : (
                <span className="text-xs text-amber-600">Pending verification</span>
              )}
            </div>
          )}
          {application.documents?.leaseAgreement && (
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700">
                Lease Agreement - {application.documents.leaseAgreement.fileName}
              </span>
              {application.documents.leaseAgreement.verified ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  Verified
                </span>
              ) : (
                <span className="text-xs text-amber-600">Pending verification</span>
              )}
            </div>
          )}
          {application.documents?.otherDocuments?.map((doc, index) => (
            <div key={index} className="flex items-center gap-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-700">{doc.fileName}</span>
              {doc.verified ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  Verified
                </span>
              ) : (
                <span className="text-xs text-amber-600">Pending verification</span>
              )}
            </div>
          ))}
          {!application.documents?.photoId &&
            !application.documents?.ssnCard &&
            !application.documents?.leaseAgreement &&
            (!application.documents?.otherDocuments ||
              application.documents.otherDocuments.length === 0) && (
              <p className="text-sm text-gray-500">No documents uploaded</p>
            )}
        </div>
      </Section>

      {/* References */}
      <Section title="References">
        {application.references && application.references.length > 0 ? (
          <div className="space-y-4">
            {application.references.map((ref, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                <p className="text-sm font-medium text-gray-900">{ref.name}</p>
                <p className="text-sm text-gray-600">{ref.relationship}</p>
                <p className="text-sm text-gray-500">
                  {ref.city}, {ref.state} - {ref.phone}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No references provided</p>
        )}
      </Section>

      {/* Admin Notes (if any are external/visible to applicant) */}
      {application.adminNotes && application.adminNotes.some((n) => !n.isInternal) && (
        <Card className="mb-6">
          <CardHeader
            title="Notes from Review Team"
            description="Messages from the administrators reviewing your application"
          />
          <CardContent>
            <div className="space-y-4">
              {application.adminNotes
                .filter((note) => !note.isInternal)
                .map((note) => (
                  <div
                    key={note.id}
                    className="bg-blue-50 rounded-lg p-4 border border-blue-100"
                  >
                    <p className="text-sm text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(note.createdAt.seconds * 1000).toLocaleDateString()} at{' '}
                      {new Date(note.createdAt.seconds * 1000).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mb-6 bg-gray-50">
        <CardContent>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-gray-600">
            If you have questions about your application or need to provide
            additional information, please contact the masjid directly or reply
            to any email notifications you've received.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
