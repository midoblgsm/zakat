import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { recordDisbursement } from '@/services/disbursement';
import type { DisbursementMethod } from '@/types/disbursement';
import { DISBURSEMENT_METHOD_LABELS } from '@/types/disbursement';

interface RecordDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicationNumber: string;
  approvedAmount?: number;
  assistanceType?: 'monthly' | 'one_time';
  onSuccess?: () => void;
}

export function RecordDisbursementModal({
  isOpen,
  onClose,
  applicationId,
  applicationNumber,
  approvedAmount,
  assistanceType,
  onSuccess,
}: RecordDisbursementModalProps) {
  const [amount, setAmount] = useState<string>(approvedAmount?.toString() || '');
  const [method, setMethod] = useState<DisbursementMethod>('check');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [periodMonth, setPeriodMonth] = useState<string>('');
  const [periodYear, setPeriodYear] = useState<string>(new Date().getFullYear().toString());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMonthly = assistanceType === 'monthly';
  const currentYear = new Date().getFullYear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);

      await recordDisbursement({
        applicationId,
        amount: parsedAmount,
        method,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        periodMonth: isMonthly && periodMonth ? parseInt(periodMonth) : undefined,
        periodYear: isMonthly && periodYear ? parseInt(periodYear) : undefined,
      });

      // Reset form
      setAmount(approvedAmount?.toString() || '');
      setMethod('check');
      setReferenceNumber('');
      setNotes('');
      setPeriodMonth('');
      setPeriodYear(currentYear.toString());

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record disbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Disbursement"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div className="text-sm text-gray-500">
            Recording disbursement for application{' '}
            <span className="font-medium text-gray-900">{applicationNumber}</span>
          </div>

          <div>
            <label
              htmlFor="disbursement-amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="disbursement-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter the amount to disburse"
              required
            />
            {approvedAmount && (
              <p className="mt-1 text-xs text-gray-500">
                Approved amount: ${approvedAmount.toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="disbursement-method"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="disbursement-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as DisbursementMethod)}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              {Object.entries(DISBURSEMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reference-number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reference / Check Number
            </label>
            <input
              type="text"
              id="reference-number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Optional: check number, transaction ID, etc."
            />
          </div>

          {isMonthly && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="period-month"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  For Month
                </label>
                <select
                  id="period-month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select month...</option>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((name, index) => (
                    <option key={index + 1} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="period-year"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  For Year
                </label>
                <select
                  id="period-year"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {periodMonth && (
                <p className="col-span-2 text-xs text-gray-500">
                  This disbursement is for{' '}
                  {new Date(parseInt(periodYear), parseInt(periodMonth) - 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="disbursement-notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes
            </label>
            <textarea
              id="disbursement-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Optional notes about this disbursement..."
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!amount || isSubmitting}
          >
            Record Disbursement
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
