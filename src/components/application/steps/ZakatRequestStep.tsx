import { useFormContext } from 'react-hook-form';
import { Input } from '../../common/Input';
import { Select, Checkbox, Textarea, RadioGroup } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { Alert } from '../../common/Alert';
import type { ZakatRequestFormData } from '../../../schemas/application';

const ASSISTANCE_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly assistance' },
  { value: 'one_time', label: 'One-time assistance' },
];

const DURATION_OPTIONS = [
  { value: '1', label: '1 month' },
  { value: '2', label: '2 months' },
  { value: '3', label: '3 months' },
  { value: '4', label: '4 months' },
  { value: '5', label: '5 months' },
  { value: '6', label: '6 months' },
  { value: '9', label: '9 months' },
  { value: '12', label: '12 months' },
];

export function ZakatRequestStep() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<{ zakatRequest: ZakatRequestFormData }>();

  const assistanceType = watch('zakatRequest.assistanceType');
  const isEligible = watch('zakatRequest.isEligible');

  return (
    <FormStep
      title="Zakat Request"
      description="Please describe why you are requesting Zakat assistance and how much you need."
    >
      <div className="space-y-6">
        {/* Eligibility Acknowledgment */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Zakat Eligibility
          </h4>
          <p className="text-sm text-blue-700 mb-4">
            Zakat is obligatory charity in Islam, given to those who are eligible
            according to Islamic guidelines. Recipients must be Muslim and fall
            under one of the eight categories mentioned in the Quran.
          </p>
          <Checkbox
            label="I believe I am eligible for Zakat assistance according to Islamic guidelines"
            {...register('zakatRequest.isEligible')}
            error={errors.zakatRequest?.isEligible?.message}
          />
        </div>

        {!isEligible && (
          <Alert variant="warning">
            You have indicated that you may not be eligible for Zakat. Your
            application will still be reviewed, and you may be directed to
            other forms of assistance if appropriate.
          </Alert>
        )}

        {/* Reason for Application */}
        <div>
          <Textarea
            label="Reason for Application"
            {...register('zakatRequest.reasonForApplication')}
            error={errors.zakatRequest?.reasonForApplication?.message}
            placeholder="Please explain your current situation and why you are seeking Zakat assistance. Be as detailed as possible about your needs and circumstances."
            hint="Minimum 20 characters required"
            rows={6}
            required
          />
        </div>

        {/* Assistance Type */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Type of Assistance Needed *
          </h3>
          <RadioGroup
            options={ASSISTANCE_TYPE_OPTIONS}
            {...register('zakatRequest.assistanceType')}
            error={errors.zakatRequest?.assistanceType?.message}
            orientation="horizontal"
          />
        </div>

        {/* Monthly Duration */}
        {assistanceType === 'monthly' && (
          <Select
            label="Duration of Monthly Assistance"
            options={DURATION_OPTIONS}
            {...register('zakatRequest.monthlyDuration', { valueAsNumber: true })}
            error={errors.zakatRequest?.monthlyDuration?.message}
            placeholder="Select duration"
            required
          />
        )}

        {/* Amount Requested */}
        <div>
          <Input
            label={
              assistanceType === 'monthly'
                ? 'Monthly Amount Requested ($)'
                : 'Total Amount Requested ($)'
            }
            type="number"
            {...register('zakatRequest.amountRequested', { valueAsNumber: true })}
            error={errors.zakatRequest?.amountRequested?.message}
            placeholder="0"
            min={1}
            hint={
              assistanceType === 'monthly'
                ? 'Amount you need per month'
                : 'Total one-time amount you need'
            }
            required
          />
        </div>

        {/* Summary */}
        {assistanceType && watch('zakatRequest.amountRequested') > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Request Summary
            </h4>
            <div className="text-sm text-gray-700">
              {assistanceType === 'monthly' ? (
                <p>
                  You are requesting{' '}
                  <strong>${watch('zakatRequest.amountRequested')}/month</strong>{' '}
                  for{' '}
                  <strong>
                    {watch('zakatRequest.monthlyDuration') || '...'} month(s)
                  </strong>
                  .
                  {watch('zakatRequest.monthlyDuration') && (
                    <>
                      {' '}
                      Total: $
                      {(
                        watch('zakatRequest.amountRequested') *
                        (watch('zakatRequest.monthlyDuration') || 1)
                      ).toLocaleString()}
                    </>
                  )}
                </p>
              ) : (
                <p>
                  You are requesting a one-time payment of{' '}
                  <strong>
                    ${watch('zakatRequest.amountRequested').toLocaleString()}
                  </strong>
                  .
                </p>
              )}
            </div>
          </div>
        )}

        {/* Important Note */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <h4 className="text-sm font-medium text-amber-900 mb-2">
            Important Note
          </h4>
          <p className="text-sm text-amber-700">
            The amount you request is not guaranteed. Each application is
            reviewed individually, and the actual amount approved may be
            different based on available funds and your specific circumstances.
          </p>
        </div>
      </div>
    </FormStep>
  );
}
