import { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import { DisbursementCard } from './DisbursementHistoryPanel';
import {
  getApplicantDisbursementSummary,
  formatDisbursementAmount,
  formatDisbursementDate,
} from '@/services/disbursement';
import type { ApplicantDisbursementSummary as ApplicantDisbursementSummaryType } from '@/types/disbursement';

interface ApplicantDisbursementSummaryProps {
  applicantId: string;
  applicantName?: string;
  compact?: boolean;
}

export function ApplicantDisbursementSummary({
  applicantId,
  applicantName,
  compact = false,
}: ApplicantDisbursementSummaryProps) {
  const [summary, setSummary] = useState<ApplicantDisbursementSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getApplicantDisbursementSummary(applicantId, applicantName);
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load disbursement summary');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [applicantId, applicantName]);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (!summary || summary.disbursementCount === 0) {
    if (compact) return null;

    return (
      <Card>
        <CardHeader
          title={`Disbursement History${applicantName ? ` - ${applicantName}` : ''}`}
        />
        <CardContent>
          <div className="text-center py-4 text-sm text-gray-500">
            No disbursements recorded for this person
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact view (for inline display)
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-amber-800">
          <BanknotesIcon className="h-5 w-5" />
          <span className="font-medium">
            Total Received: {formatDisbursementAmount(summary.totalDisbursed)}
          </span>
          <span className="text-amber-600 text-sm">
            ({summary.disbursementCount} disbursement{summary.disbursementCount !== 1 ? 's' : ''} across {summary.applicationCount} application{summary.applicationCount !== 1 ? 's' : ''})
          </span>
        </div>
        {summary.byMasjid.length > 1 && (
          <div className="mt-2 text-xs text-amber-700">
            From: {summary.byMasjid.map(m => m.masjidName).join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <Card>
      <CardHeader
        title={`Disbursement History${applicantName ? ` - ${applicantName}` : ''}`}
        description="All disbursements received by this person across all applications"
      />
      <CardContent>
        {/* Summary Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                Total Received
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {formatDisbursementAmount(summary.totalDisbursed)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                Disbursements
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {summary.disbursementCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                Applications
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {summary.applicationCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                Masajid
              </p>
              <p className="text-2xl font-bold text-blue-700">
                {summary.byMasjid.length}
              </p>
            </div>
          </div>
        </div>

        {/* Masjid Breakdown */}
        {summary.byMasjid.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <BuildingLibraryIcon className="h-4 w-4" />
              Breakdown by Masjid
            </h4>
            <div className="space-y-2">
              {summary.byMasjid.map((masjid) => (
                <div
                  key={masjid.masjidId}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{masjid.masjidName}</p>
                    <p className="text-sm text-gray-500">
                      {masjid.disbursementCount} disbursement{masjid.disbursementCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDisbursementAmount(masjid.totalDisbursed)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disbursement Details (Expandable) */}
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              All Disbursements ({summary.disbursementCount})
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {summary.disbursements.map((disbursement) => (
                <div key={disbursement.id} className="relative">
                  <DisbursementCard disbursement={disbursement} />
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {disbursement.applicationNumber}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last Disbursement Info */}
        {summary.lastDisbursedAt && (
          <p className="mt-4 text-xs text-gray-500 text-center">
            Last disbursement: {formatDisbursementDate(summary.lastDisbursedAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
