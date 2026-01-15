import { formatDistanceToNow } from 'date-fns';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { SeverityBadge, FlagStatusBadge } from '../common/Badge';
import type { ApplicantFlag } from '@/types/flag';
import type { Timestamp } from 'firebase/firestore';

interface FlagCardProps {
  flag: ApplicantFlag;
  onViewDetails?: (flag: ApplicantFlag) => void;
  onResolve?: (flag: ApplicantFlag) => void;
  showApplicantInfo?: boolean;
  showMasjidInfo?: boolean;
  canResolve?: boolean;
}

function formatTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate();
  return formatDistanceToNow(date, { addSuffix: true });
}

export function FlagCard({
  flag,
  onViewDetails,
  onResolve,
  showApplicantInfo = true,
  showMasjidInfo = true,
  canResolve = false,
}: FlagCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header with badges */}
          <div className="flex items-center gap-2 mb-2">
            <SeverityBadge severity={flag.severity} />
            <FlagStatusBadge isActive={flag.isActive} />
          </div>

          {/* Applicant info */}
          {showApplicantInfo && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {flag.applicantName}
              </h3>
              <p className="text-xs text-gray-500">{flag.applicantEmail}</p>
              {flag.applicationNumber && (
                <p className="text-xs text-gray-500">
                  Application: {flag.applicationNumber}
                </p>
              )}
            </div>
          )}

          {/* Flag reason */}
          <div className="mb-3">
            <p className="text-sm text-gray-700 line-clamp-2">{flag.reason}</p>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Flagged {formatTimestamp(flag.createdAt)}</span>
            <span>by {flag.flaggedByName}</span>
            {showMasjidInfo && flag.flaggedByMasjidName && (
              <span>at {flag.flaggedByMasjidName}</span>
            )}
          </div>

          {/* Resolution info if resolved */}
          {!flag.isActive && flag.resolvedAt && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Resolved {formatTimestamp(flag.resolvedAt)}
              </p>
              {flag.resolutionNotes && (
                <p className="text-xs text-gray-600 mt-1 italic">
                  "{flag.resolutionNotes}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 ml-4">
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(flag)}
            >
              View
            </Button>
          )}
          {canResolve && flag.isActive && onResolve && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onResolve(flag)}
            >
              Resolve
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Compact version for lists
interface FlagListItemProps {
  flag: ApplicantFlag;
  onClick?: (flag: ApplicantFlag) => void;
}

export function FlagListItem({ flag, onClick }: FlagListItemProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(flag)}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Severity indicator */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            flag.severity === 'blocked' ? 'bg-red-500' : 'bg-amber-500'
          }`}
        />

        {/* Applicant info */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {flag.applicantName}
          </p>
          <p className="text-xs text-gray-500 truncate">{flag.reason}</p>
        </div>
      </div>

      {/* Status and date */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <FlagStatusBadge isActive={flag.isActive} size="sm" />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatTimestamp(flag.createdAt)}
        </span>
      </div>
    </div>
  );
}
