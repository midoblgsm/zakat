import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import {
  getAllApplicantsDisbursements,
  formatDisbursementAmount,
  formatDisbursementDate,
} from '@/services/disbursement';
import { ROUTES } from '@/utils/constants';
import type { AllApplicantsDisbursementSummary, ApplicantDisbursementSummary } from '@/types/disbursement';

export function DisbursementsPage() {
  const [data, setData] = useState<AllApplicantsDisbursementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedApplicant, setExpandedApplicant] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getAllApplicantsDisbursements();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load disbursement data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Disbursements</h1>
        <p className="mt-1 text-sm text-gray-600">
          View all disbursements across all applicants with masjid breakdown
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <BanknotesIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Disbursed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDisbursementAmount(data.totalDisbursed)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Recipients</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.totalApplicants}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <BuildingLibraryIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Average per Person</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.totalApplicants > 0
                        ? formatDisbursementAmount(data.totalDisbursed / data.totalApplicants)
                        : '$0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applicants List */}
          <Card>
            <CardHeader
              title="Recipients"
              description={`${data.applicants.length} people have received disbursements`}
            />
            <CardContent>
              {data.applicants.length === 0 ? (
                <div className="text-center py-8">
                  <BanknotesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No disbursements recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.applicants.map((applicant) => (
                    <ApplicantRow
                      key={applicant.applicantId}
                      applicant={applicant}
                      isExpanded={expandedApplicant === applicant.applicantId}
                      onToggle={() =>
                        setExpandedApplicant(
                          expandedApplicant === applicant.applicantId
                            ? null
                            : applicant.applicantId
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface ApplicantRowProps {
  applicant: ApplicantDisbursementSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

function ApplicantRow({ applicant, isExpanded, onToggle }: ApplicantRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Main Row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-medium text-gray-600">
              {applicant.applicantName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900">{applicant.applicantName}</p>
            <p className="text-sm text-gray-500">
              {applicant.disbursementCount} disbursement{applicant.disbursementCount !== 1 ? 's' : ''} across{' '}
              {applicant.applicationCount} application{applicant.applicationCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              {formatDisbursementAmount(applicant.totalDisbursed)}
            </p>
            <p className="text-xs text-gray-500">
              {applicant.byMasjid.length} masjid{applicant.byMasjid.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {/* Masjid Breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <BuildingLibraryIcon className="h-4 w-4" />
              Breakdown by Masjid
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {applicant.byMasjid.map((masjid) => (
                <div
                  key={masjid.masjidId}
                  className="bg-white rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{masjid.masjidName}</p>
                    <p className="text-xs text-gray-500">
                      {masjid.disbursementCount} disbursement{masjid.disbursementCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatDisbursementAmount(masjid.totalDisbursed)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Disbursements */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Disbursements</h4>
            <div className="space-y-2">
              {applicant.disbursements.slice(0, 5).map((disb) => (
                <div
                  key={disb.id}
                  className="bg-white rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDisbursementAmount(disb.amount)}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {disb.applicationNumber}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {disb.masjidName} • {formatDisbursementDate(disb.disbursedAt)}
                    </p>
                  </div>
                </div>
              ))}
              {applicant.disbursements.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{applicant.disbursements.length - 5} more disbursements
                </p>
              )}
            </div>
          </div>

          {/* View Applications Link */}
          <div className="flex justify-end">
            <Link
              to={`${ROUTES.SUPER_ADMIN.APPLICATIONS}?applicantId=${applicant.applicantId}`}
              className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              View Applications
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
