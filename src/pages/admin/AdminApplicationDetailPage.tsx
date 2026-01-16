import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal, ModalFooter } from '@/components/common/Modal';
import { MasjidNameDisplay } from '@/components/common/MasjidNameDisplay';
import { DocumentVerificationPanel } from '@/components/admin/DocumentVerificationPanel';
import { DisbursementHistoryPanel } from '@/components/admin/DisbursementHistoryPanel';
import { ApplicantDisbursementSummary } from '@/components/admin/ApplicantDisbursementSummary';
import { FlagApplicantModal, FlagAlertBanner } from '@/components/flags';
import { createFlag } from '@/services/flag';
import type { FlagSeverity } from '@/types/flag';
import { useAuth } from '@/contexts/AuthContext';
import {
  getApplicationForAdmin,
  claimApplication,
  releaseApplication,
  changeApplicationStatus,
  addAdminNote,
  getValidStatusTransitions,
  getApplicationHistory,
} from '@/services/admin';
import {
  ROUTES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '@/utils/constants';
import type {
  ZakatApplication,
  ApplicationStatus,
  ApplicationHistoryEntry,
} from '@/types/application';

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

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ApplicationStatus;
  approvedAmount?: number;
  onSubmit: (status: ApplicationStatus, notes: string, disbursedAmount?: number) => Promise<void>;
  isSubmitting: boolean;
}

function StatusChangeModal({
  isOpen,
  onClose,
  currentStatus,
  approvedAmount,
  onSubmit,
  isSubmitting,
}: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [disbursedAmount, setDisbursedAmount] = useState<string>('');
  const validTransitions = getValidStatusTransitions(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;
    const amount = selectedStatus === 'disbursed' ? parseFloat(disbursedAmount) || 0 : undefined;
    await onSubmit(selectedStatus, notes, amount);
    setSelectedStatus('');
    setNotes('');
    setDisbursedAmount('');
  };

  // Pre-fill disbursed amount with approved amount when selecting 'disbursed'
  const handleStatusChange = (status: ApplicationStatus) => {
    setSelectedStatus(status);
    if (status === 'disbursed' && approvedAmount && !disbursedAmount) {
      setDisbursedAmount(approvedAmount.toString());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Application Status"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Status
            </label>
            <StatusBadge status={currentStatus} />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Status
            </label>
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) =>
                handleStatusChange(e.target.value as ApplicationStatus)
              }
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              <option value="">Select a status...</option>
              {validTransitions.map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {selectedStatus === 'disbursed' && (
            <div>
              <label
                htmlFor="disbursedAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Disbursed Amount ($)
              </label>
              <input
                type="number"
                id="disbursedAmount"
                value={disbursedAmount}
                onChange={(e) => setDisbursedAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Enter the amount disbursed..."
                required
              />
              {approvedAmount && (
                <p className="mt-1 text-xs text-gray-500">
                  Approved amount: ${approvedAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Add any notes about this status change..."
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!selectedStatus || (selectedStatus === 'disbursed' && !disbursedAmount) || isSubmitting}
          >
            Update Status
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, isInternal: boolean) => Promise<void>;
  isSubmitting: boolean;
}

function AddNoteModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddNoteModalProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content, isInternal);
    setContent('');
    setIsInternal(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Note" size="md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="note-content"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Note Content
            </label>
            <textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter your note..."
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-internal"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="is-internal"
              className="text-sm text-gray-700"
            >
              Internal note (not visible to applicant)
            </label>
          </div>

          {!isInternal && (
            <Alert variant="warning">
              This note will be visible to the applicant.
            </Alert>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!content.trim() || isSubmitting}
          >
            Add Note
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, claims } = useAuth();

  const [application, setApplication] = useState<ZakatApplication | null>(null);
  const [history, setHistory] = useState<ApplicationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action states
  const [isClaiming, setIsClaiming] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const loadApplication = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const [app, hist] = await Promise.all([
        getApplicationForAdmin(id),
        getApplicationHistory(id),
      ]);

      if (!app) {
        setError('Application not found');
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
  }, [id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleClaim = async () => {
    if (!application || !user || !profile || !claims?.masjidId) return;

    try {
      setIsClaiming(true);
      setError(null);

      await claimApplication(
        application.id,
        user.uid,
        `${profile.firstName} ${profile.lastName}`,
        claims.masjidId
      );

      setSuccessMessage('Application claimed successfully!');
      await loadApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim application');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRelease = async () => {
    if (!application || !user || !profile || !claims?.masjidId) return;

    try {
      setIsReleasing(true);
      setError(null);

      await releaseApplication(
        application.id,
        user.uid,
        `${profile.firstName} ${profile.lastName}`,
        claims.masjidId
      );

      setSuccessMessage('Application released back to the pool.');
      navigate(ROUTES.ADMIN.MY_APPLICATIONS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release application');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleStatusChange = async (
    newStatus: ApplicationStatus,
    notes: string,
    disbursedAmount?: number
  ) => {
    if (!application || !user || !profile || !claims?.masjidId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await changeApplicationStatus(
        application.id,
        newStatus,
        user.uid,
        `${profile.firstName} ${profile.lastName}`,
        claims.masjidId,
        notes || undefined,
        disbursedAmount
      );

      setSuccessMessage('Status updated successfully!');
      setIsStatusModalOpen(false);
      await loadApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (content: string, isInternal: boolean) => {
    if (!application || !user || !profile || !claims?.masjidId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await addAdminNote(
        application.id,
        content,
        user.uid,
        `${profile.firstName} ${profile.lastName}`,
        claims.masjidId,
        isInternal
      );

      setSuccessMessage('Note added successfully!');
      setIsNoteModalOpen(false);
      await loadApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagApplicant = async (reason: string, severity: FlagSeverity) => {
    if (!application) return;

    await createFlag({
      applicantId: application.applicantId,
      applicationId: application.id,
      reason,
      severity,
    });

    setSuccessMessage('Applicant flagged successfully. This flag is now visible across all masajid.');
    setIsFlagModalOpen(false);
    await loadApplication();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Alert variant="error">{error}</Alert>
        <div className="mt-4">
          <Link to={ROUTES.ADMIN.POOL}>
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Pool
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  const isSuperAdmin = claims?.role === 'super_admin';
  const isZakatAdmin = claims?.role === 'zakat_admin';
  const isAdmin = isSuperAdmin || isZakatAdmin;
  const isAssignedToMe = application.assignedTo === user?.uid;
  const hasMasjidId = !!claims?.masjidId;
  const canClaim = application.status === 'submitted' && !application.assignedTo && hasMasjidId;
  const canRelease = isAssignedToMe && hasMasjidId;
  const canChangeStatus = isAssignedToMe && application.status !== 'submitted' && hasMasjidId;
  const canAddNote = (isAssignedToMe || isSuperAdmin) && hasMasjidId;
  const canFlag = (isAssignedToMe || isSuperAdmin) && !application.applicantSnapshot.isFlagged;

  const submittedDate = application.submittedAt?.toDate
    ? application.submittedAt.toDate()
    : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={isSuperAdmin ? ROUTES.SUPER_ADMIN.APPLICATIONS : (isAssignedToMe ? ROUTES.ADMIN.MY_APPLICATIONS : ROUTES.ADMIN.POOL)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          {isSuperAdmin ? 'Back to Applications' : (isAssignedToMe ? 'Back to My Cases' : 'Back to Pool')}
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              {getStatusIcon(application.status)}
              <h1 className="text-2xl font-bold text-gray-900">
                {application.applicationNumber}
              </h1>
              {application.applicantSnapshot.isFlagged && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Flagged
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {submittedDate
                ? `Submitted on ${submittedDate.toLocaleDateString()}`
                : 'Not yet submitted'}
            </p>
            {application.assignedTo && (
              <p className="mt-1 text-sm text-gray-500">
                Assigned to:{' '}
                {isAssignedToMe ? (
                  <span className="font-medium text-primary-600">You</span>
                ) : (
                  <MasjidNameDisplay
                    masjidId={application.assignedToMasjid}
                    masjidName={application.assignedToMasjidName}
                    zipCode={application.assignedToMasjidZipCode}
                  />
                )}
              </p>
            )}
          </div>
          <StatusBadge status={application.status} />
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <Alert
          variant="success"
          className="mb-6"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Cross-Masjid Flag Alert */}
      {application.applicantSnapshot.isFlagged && (
        <div className="mb-6">
          <FlagAlertBanner
            applicantId={application.applicantId}
            applicantName={application.applicantSnapshot.name}
          />
        </div>
      )}

      {/* Admin Actions */}
      <Card className="mb-6">
        <CardHeader title="Actions" />
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {canClaim && (
              <Button onClick={handleClaim} loading={isClaiming}>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Claim Application
              </Button>
            )}
            {canRelease && (
              <Button
                variant="outline"
                onClick={handleRelease}
                loading={isReleasing}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Release to Pool
              </Button>
            )}
            {canChangeStatus && (
              <Button
                variant="outline"
                onClick={() => setIsStatusModalOpen(true)}
              >
                <PencilSquareIcon className="h-4 w-4 mr-2" />
                Change Status
              </Button>
            )}
            {canAddNote && (
              <Button
                variant="outline"
                onClick={() => setIsNoteModalOpen(true)}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            )}
            {canFlag && (
              <Button
                variant="outline"
                onClick={() => setIsFlagModalOpen(true)}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                <FlagIcon className="h-4 w-4 mr-2" />
                Flag Applicant
              </Button>
            )}
          </div>
          {!canClaim && !canRelease && !canChangeStatus && !canAddNote && (
            <p className="text-sm text-gray-500">
              {isSuperAdmin
                ? 'View-only mode. Super admins can monitor applications but cannot claim or modify them directly.'
                : 'No actions available. Claim the application to make changes.'}
            </p>
          )}
        </CardContent>
      </Card>

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
        <InfoRow label="SSN" value={application.demographics?.ssn ? '***-**-' + application.demographics.ssn.slice(-4) : null} />
        <InfoRow
          label="Marital Status"
          value={application.demographics?.maritalStatus}
        />
        <InfoRow
          label="Primary Language"
          value={application.demographics?.primaryLanguage}
        />
        <InfoRow
          label="Speaks English"
          value={application.demographics?.speaksEnglish}
        />
        <InfoRow
          label="Has Driver License"
          value={application.demographics?.hasDriverLicense}
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
        <InfoRow label="Secondary Phone" value={application.contact?.phoneSecondary} />
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
                  {member.incomeSource && ` - Income: ${member.incomeSource}`}
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
        {application.financial?.receivesGovernmentAid && (
          <InfoRow
            label="Government Aid Details"
            value={application.financial?.governmentAidDetails}
          />
        )}
        <InfoRow
          label="Total Assets"
          value={`$${application.financial?.assets?.totalValue?.toLocaleString() || 0}`}
        />
        <InfoRow
          label="Total Debt"
          value={`$${application.financial?.totalDebt?.toLocaleString() || 0}`}
        />
        <InfoRow
          label="Total Monthly Expenses"
          value={`$${application.financial?.totalMonthlyExpenses?.toLocaleString() || 0}`}
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
          label="Shares Rent"
          value={application.circumstances?.sharesRent}
        />
        <InfoRow
          label="Transportation"
          value={application.circumstances?.transportationType}
        />
        <InfoRow
          label="Employment Status"
          value={application.circumstances?.employmentStatus}
        />
        {application.circumstances?.employerName && (
          <InfoRow
            label="Employer"
            value={application.circumstances.employerName}
          />
        )}
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
      <DocumentVerificationPanel
        applicationId={application.id}
        documents={application.documents}
        canVerify={isAssignedToMe && hasMasjidId}
        onUpdate={loadApplication}
      />

      {/* Disbursement History */}
      {['approved', 'disbursed', 'closed'].includes(application.status) && (
        <DisbursementHistoryPanel
          applicationId={application.id}
          applicationNumber={application.applicationNumber}
          approvedAmount={application.resolution?.amountApproved}
          assistanceType={application.zakatRequest?.assistanceType}
          canRecordDisbursement={isAssignedToMe && hasMasjidId}
          applicationStatus={application.status}
        />
      )}

      {/* Person-Level Disbursement Summary (shown if person has received disbursements from other applications) */}
      {isAdmin && application.applicantId && (
        <div className="mb-6">
          <ApplicantDisbursementSummary
            applicantId={application.applicantId}
            applicantName={application.applicantSnapshot?.name}
          />
        </div>
      )}

      {/* References */}
      <Section title="References">
        {application.references && application.references.length > 0 ? (
          <div className="space-y-4">
            {application.references.map((ref, index) => (
              <div
                key={index}
                className="border-b border-gray-100 pb-4 last:border-0"
              >
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

      {/* Admin Notes */}
      <Card className="mb-6">
        <CardHeader
          title="Admin Notes"
          description="Internal and external notes from reviewers"
        />
        <CardContent>
          {application.adminNotes && application.adminNotes.length > 0 ? (
            <div className="space-y-4">
              {application.adminNotes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-lg p-4 ${
                    note.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {note.createdByName}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        note.isInternal
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {note.isInternal ? 'Internal' : 'Visible to Applicant'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{note.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(note.createdAt.seconds * 1000).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No notes yet</p>
          )}
        </CardContent>
      </Card>

      {/* Application History */}
      <Card className="mb-6">
        <CardHeader
          title="Application History"
          description="Timeline of all actions taken on this application"
        />
        <CardContent>
          {history.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {history.map((entry, index) => (
                  <li key={entry.id}>
                    <div className="relative pb-8">
                      {index !== history.length - 1 && (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            <ClockIcon className="h-4 w-4 text-gray-500" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">
                                {entry.performedByName}
                              </span>{' '}
                              {entry.details}
                            </p>
                            {entry.previousStatus && entry.newStatus && (
                              <p className="text-xs text-gray-400 mt-1">
                                {APPLICATION_STATUS_LABELS[entry.previousStatus]} &rarr;{' '}
                                {APPLICATION_STATUS_LABELS[entry.newStatus]}
                              </p>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            {new Date(
                              entry.createdAt.seconds * 1000
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No history available</p>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <StatusChangeModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={application.status}
        approvedAmount={application.resolution?.amountApproved}
        onSubmit={handleStatusChange}
        isSubmitting={isSubmitting}
      />

      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={handleAddNote}
        isSubmitting={isSubmitting}
      />

      <FlagApplicantModal
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
        onSubmit={handleFlagApplicant}
        applicantName={application.applicantSnapshot.name}
        applicantEmail={application.applicantSnapshot.email}
        applicationNumber={application.applicationNumber}
      />
    </div>
  );
}
