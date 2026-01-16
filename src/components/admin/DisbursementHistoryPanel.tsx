import { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  UserIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import { RecordDisbursementModal } from './RecordDisbursementModal';
import {
  getApplicationDisbursements,
  formatDisbursementAmount,
  formatDisbursementDate,
  getDisbursementPeriodLabel,
} from '@/services/disbursement';
import { DISBURSEMENT_METHOD_LABELS } from '@/types/disbursement';
import type { ApplicationDisbursementSummary, Disbursement } from '@/types/disbursement';

interface DisbursementHistoryPanelProps {
  applicationId: string;
  applicationNumber: string;
  approvedAmount?: number;
  assistanceType?: 'monthly' | 'one_time';
  canRecordDisbursement: boolean;
  applicationStatus: string;
}

export function DisbursementHistoryPanel({
  applicationId,
  applicationNumber,
  approvedAmount,
  assistanceType,
  canRecordDisbursement,
  applicationStatus,
}: DisbursementHistoryPanelProps) {
  const [summary, setSummary] = useState<ApplicationDisbursementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadDisbursements = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getApplicationDisbursements(applicationId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disbursement history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDisbursements();
  }, [applicationId]);

  const canDisburse = canRecordDisbursement && ['approved', 'disbursed'].includes(applicationStatus);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader title="Disbursement History" />
        <CardContent>
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader
          title="Disbursement History"
          description="Track all disbursements made for this application"
          action={
            canDisburse && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Record Disbursement
              </Button>
            )
          }
        />
        <CardContent>
          {error && (
            <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Summary Stats */}
          {summary && summary.disbursementCount > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6 border border-green-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">
                    Total Disbursed
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatDisbursementAmount(summary.totalDisbursed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">
                    Disbursements
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {summary.disbursementCount}
                  </p>
                </div>
                {approvedAmount && (
                  <div>
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wider">
                      Remaining
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatDisbursementAmount(Math.max(0, approvedAmount - summary.totalDisbursed))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disbursement List */}
          {summary && summary.disbursements.length > 0 ? (
            <div className="space-y-4">
              {summary.disbursements.map((disbursement) => (
                <DisbursementCard key={disbursement.id} disbursement={disbursement} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BanknotesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No disbursements recorded yet</p>
              {canDisburse && (
                <Button size="sm" onClick={() => setIsModalOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Record First Disbursement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RecordDisbursementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        applicationId={applicationId}
        applicationNumber={applicationNumber}
        approvedAmount={approvedAmount}
        assistanceType={assistanceType}
        onSuccess={loadDisbursements}
      />
    </>
  );
}

interface DisbursementCardProps {
  disbursement: Disbursement;
}

function DisbursementCard({ disbursement }: DisbursementCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <BanknotesIcon className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDisbursementAmount(disbursement.amount)}
            </p>
            <p className="text-sm text-gray-500">
              {DISBURSEMENT_METHOD_LABELS[disbursement.method] || disbursement.method}
              {disbursement.referenceNumber && (
                <span className="ml-2 text-gray-400">
                  #{disbursement.referenceNumber}
                </span>
              )}
            </p>
          </div>
        </div>
        {disbursement.periodMonth && disbursement.periodYear && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {getDisbursementPeriodLabel(disbursement.periodMonth, disbursement.periodYear)}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <CalendarDaysIcon className="h-4 w-4" />
          <span>{formatDisbursementDate(disbursement.disbursedAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <UserIcon className="h-4 w-4" />
          <span>{disbursement.disbursedByName}</span>
        </div>
        <div className="flex items-center gap-1">
          <BuildingLibraryIcon className="h-4 w-4" />
          <span>{disbursement.masjidName}</span>
        </div>
      </div>

      {disbursement.notes && (
        <div className="mt-3 text-sm text-gray-600 bg-gray-50 rounded p-2">
          {disbursement.notes}
        </div>
      )}
    </div>
  );
}

export { DisbursementCard };
