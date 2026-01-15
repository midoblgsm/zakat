import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, FlagIcon } from '@heroicons/react/24/solid';
import { getFlagsForApplicant } from '@/services/flag';
import { SeverityBadge } from '@/components/common/Badge';
import type { ApplicantFlag } from '@/types/flag';

interface FlagIndicatorProps {
  applicantId: string;
  isFlagged: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function FlagIndicator({
  applicantId,
  isFlagged,
  size = 'md',
  showDetails = true,
}: FlagIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [flags, setFlags] = useState<ApplicantFlag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isHovered && showDetails && flags.length === 0) {
      loadFlags();
    }
  }, [isHovered, showDetails, applicantId, flags.length]);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const flagsData = await getFlagsForApplicant(applicantId);
      setFlags(flagsData.filter((f) => f.isActive));
    } catch (error) {
      console.error('Error loading flags:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isFlagged) {
    return null;
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1 text-red-600 cursor-help">
        <ExclamationTriangleIcon className={sizeClasses[size]} />
        {size !== 'sm' && (
          <span className="text-xs font-medium">Flagged</span>
        )}
      </div>

      {/* Tooltip with flag details */}
      {isHovered && showDetails && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlagIcon className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-gray-900">Cross-Masjid Flag</h4>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading flag details...</p>
          ) : flags.length > 0 ? (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="border-l-2 border-red-400 pl-3 py-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={flag.severity} size="sm" />
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {flag.reason}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Flagged by{' '}
                    <span className="font-medium">
                      {flag.flaggedByMasjidName || 'Unknown Masjid'}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active flags found</p>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              This flag is visible to all masajid in the network
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple inline flag badge for compact displays
interface FlagBadgeProps {
  isFlagged: boolean;
  severity?: 'warning' | 'blocked';
  masjidName?: string;
}

export function FlagBadge({ isFlagged, severity, masjidName }: FlagBadgeProps) {
  if (!isFlagged) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        severity === 'blocked'
          ? 'bg-red-100 text-red-800'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      <ExclamationTriangleIcon className="h-3 w-3" />
      <span>Flagged</span>
      {masjidName && (
        <span className="text-gray-500">by {masjidName}</span>
      )}
    </div>
  );
}

// Alert banner for flagged applicants
interface FlagAlertBannerProps {
  applicantId: string;
  applicantName: string;
}

export function FlagAlertBanner({
  applicantId,
  applicantName,
}: FlagAlertBannerProps) {
  const [flags, setFlags] = useState<ApplicantFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, [applicantId]);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const flagsData = await getFlagsForApplicant(applicantId);
      setFlags(flagsData.filter((f) => f.isActive));
    } catch (error) {
      console.error('Error loading flags:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || flags.length === 0) {
    return null;
  }

  const hasBlockedFlag = flags.some((f) => f.severity === 'blocked');
  const bgColor = hasBlockedFlag ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textColor = hasBlockedFlag ? 'text-red-800' : 'text-amber-800';
  const iconColor = hasBlockedFlag ? 'text-red-500' : 'text-amber-500';

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <FlagIcon className={`h-6 w-6 ${iconColor} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${textColor}`}>
            Cross-Masjid Flag Alert
          </h3>
          <p className={`text-sm ${textColor} mt-1`}>
            <strong>{applicantName}</strong> has been flagged by{' '}
            {flags.length === 1 ? 'another masjid' : `${flags.length} masajid`}:
          </p>
          <ul className="mt-2 space-y-2">
            {flags.map((flag) => (
              <li
                key={flag.id}
                className="text-sm flex items-start gap-2"
              >
                <SeverityBadge severity={flag.severity} size="sm" />
                <span className={textColor}>
                  {flag.reason}
                  <span className="text-gray-500 ml-1">
                    ({flag.flaggedByMasjidName || 'Unknown'})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
