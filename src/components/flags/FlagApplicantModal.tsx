import { useState } from 'react';
import { Modal, ModalFooter } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import type { FlagSeverity } from '@/types/flag';

interface FlagApplicantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, severity: FlagSeverity) => Promise<void>;
  applicantName: string;
  applicantEmail: string;
  applicationNumber?: string;
}

const severityOptions: { value: FlagSeverity; label: string; description: string }[] = [
  {
    value: 'warning',
    label: 'Warning',
    description: 'Flag for review - applicant can still submit applications',
  },
  {
    value: 'blocked',
    label: 'Blocked',
    description: 'Block applicant - prevents new applications from being processed',
  },
];

const commonReasons = [
  'Suspected duplicate application',
  'Inconsistent information provided',
  'Unable to verify identity',
  'Suspected fraud',
  'Previously flagged for similar issues',
  'Information does not match documentation',
];

export function FlagApplicantModal({
  isOpen,
  onClose,
  onSubmit,
  applicantName,
  applicantEmail,
  applicationNumber,
}: FlagApplicantModalProps) {
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<FlagSeverity>('warning');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for flagging this applicant');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(reason.trim(), severity);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag applicant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setSeverity('warning');
    setError(null);
    onClose();
  };

  const handleCommonReasonClick = (commonReason: string) => {
    setReason((prev) => {
      if (prev.includes(commonReason)) return prev;
      return prev ? `${prev}\n${commonReason}` : commonReason;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Flag Applicant"
      description="Flagging an applicant marks them for cross-masjid visibility. This helps prevent fraud and duplicate applications."
      size="lg"
    >
      <div className="space-y-6">
        {/* Applicant Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Applicant to Flag
          </h4>
          <p className="text-sm font-semibold text-gray-900">{applicantName}</p>
          <p className="text-sm text-gray-600">{applicantEmail}</p>
          {applicationNumber && (
            <p className="text-sm text-gray-500 mt-1">
              Application: {applicationNumber}
            </p>
          )}
        </div>

        {/* Severity Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flag Severity
          </label>
          <div className="space-y-3">
            {severityOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  severity === option.value
                    ? option.value === 'blocked'
                      ? 'border-red-500 bg-red-50'
                      : 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={option.value}
                  checked={severity === option.value}
                  onChange={(e) => setSeverity(e.target.value as FlagSeverity)}
                  className="mt-0.5"
                />
                <div className="ml-3">
                  <span
                    className={`text-sm font-medium ${
                      severity === option.value
                        ? option.value === 'blocked'
                          ? 'text-red-700'
                          : 'text-amber-700'
                        : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {option.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Common Reasons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Common Reasons (click to add)
          </label>
          <div className="flex flex-wrap gap-2">
            {commonReasons.map((commonReason) => (
              <button
                key={commonReason}
                type="button"
                onClick={() => handleCommonReasonClick(commonReason)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  reason.includes(commonReason)
                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {commonReason}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label
            htmlFor="reason"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Detailed Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a detailed explanation for flagging this applicant..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            rows={4}
          />
          <p className="mt-1 text-xs text-gray-500">
            This information will be visible to all Zakat administrators across all masajid.
          </p>
        </div>

        {/* Warning */}
        <Alert variant="warning">
          <strong>Cross-Masjid Visibility:</strong> This flag will be visible to
          all Zakat administrators across all participating masajid to help
          prevent fraud and duplicate applications.
        </Alert>

        {/* Error */}
        {error && <Alert variant="error">{error}</Alert>}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant={severity === 'blocked' ? 'danger' : 'primary'}
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!reason.trim()}
        >
          {severity === 'blocked' ? 'Block Applicant' : 'Flag Applicant'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
