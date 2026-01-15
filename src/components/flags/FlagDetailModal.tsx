import { useState } from 'react';
import { format } from 'date-fns';
import { Modal, ModalFooter } from '../common/Modal';
import { Button } from '../common/Button';
import { SeverityBadge, FlagStatusBadge } from '../common/Badge';
import type { ApplicantFlag } from '@/types/flag';
import type { Timestamp } from 'firebase/firestore';

interface FlagDetailModalProps {
  flag: ApplicantFlag | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (flagId: string, resolutionNotes: string) => Promise<void>;
  canResolve?: boolean;
}

function formatTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp) return 'Unknown';
  return format(timestamp.toDate(), 'MMM d, yyyy h:mm a');
}

export function FlagDetailModal({
  flag,
  isOpen,
  onClose,
  onResolve,
  canResolve = false,
}: FlagDetailModalProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!flag || !onResolve || !resolutionNotes.trim()) {
      setError('Resolution notes are required');
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      await onResolve(flag.id, resolutionNotes.trim());
      setResolutionNotes('');
      setShowResolveForm(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve flag');
    } finally {
      setIsResolving(false);
    }
  };

  const handleClose = () => {
    setShowResolveForm(false);
    setResolutionNotes('');
    setError(null);
    onClose();
  };

  if (!flag) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Flag Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Status badges */}
        <div className="flex items-center gap-3">
          <SeverityBadge severity={flag.severity} size="lg" />
          <FlagStatusBadge isActive={flag.isActive} size="lg" />
        </div>

        {/* Applicant Information */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Flagged Applicant
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900">
              {flag.applicantName}
            </p>
            <p className="text-sm text-gray-600">{flag.applicantEmail}</p>
            {flag.applicationNumber && (
              <p className="text-sm text-gray-500 mt-1">
                Application: {flag.applicationNumber}
              </p>
            )}
          </div>
        </div>

        {/* Flag Reason */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Reason for Flag
          </h4>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-800">{flag.reason}</p>
          </div>
        </div>

        {/* Flag Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Flagged By
            </h4>
            <p className="text-sm text-gray-900">{flag.flaggedByName}</p>
            {flag.flaggedByMasjidName && (
              <p className="text-xs text-gray-500">{flag.flaggedByMasjidName}</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Date Flagged
            </h4>
            <p className="text-sm text-gray-900">
              {formatTimestamp(flag.createdAt)}
            </p>
          </div>
        </div>

        {/* Resolution Info (if resolved) */}
        {!flag.isActive && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Resolution
            </h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              {flag.resolutionNotes && (
                <p className="text-sm text-gray-800 mb-2">
                  {flag.resolutionNotes}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Resolved on {formatTimestamp(flag.resolvedAt)}
              </p>
            </div>
          </div>
        )}

        {/* Resolve Form */}
        {canResolve && flag.isActive && showResolveForm && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Resolve Flag
            </h4>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Enter resolution notes explaining why this flag is being resolved..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              rows={3}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        )}
      </div>

      <ModalFooter>
        {showResolveForm ? (
          <>
            <Button
              variant="ghost"
              onClick={() => setShowResolveForm(false)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResolve}
              loading={isResolving}
              disabled={!resolutionNotes.trim()}
            >
              Confirm Resolution
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
            {canResolve && flag.isActive && (
              <Button
                variant="secondary"
                onClick={() => setShowResolveForm(true)}
              >
                Resolve Flag
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
