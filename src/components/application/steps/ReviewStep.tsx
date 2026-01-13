import { useFormContext } from 'react-hook-form';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Checkbox } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { Alert } from '../../common/Alert';
import type { ApplicationFormData } from '../../../schemas/application';

interface SectionSummaryProps {
  title: string;
  isComplete: boolean;
  children: React.ReactNode;
}

function SectionSummary({ title, isComplete, children }: SectionSummaryProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        {isComplete ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
        )}
      </div>
      <div className="p-4 text-sm text-gray-600">{children}</div>
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: string | number | boolean | undefined | null;
}

function DataRow({ label, value }: DataRowProps) {
  let displayValue = value;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (value === undefined || value === null || value === '') {
    displayValue = 'Not provided';
  }

  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-900">{String(displayValue)}</span>
    </div>
  );
}

export function ReviewStep() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  const formData = watch();

  // Check section completeness
  const isDemographicsComplete = !!(
    formData.demographics?.fullName &&
    formData.demographics?.age &&
    formData.demographics?.gender &&
    formData.demographics?.ssn
  );

  const isContactComplete = !!(
    formData.contact?.address?.street &&
    formData.contact?.address?.city &&
    formData.contact?.phone &&
    formData.contact?.email
  );

  const isHouseholdComplete = true; // Optional section

  const isAssetsComplete = !!(
    formData.assets?.cashOnHand !== undefined &&
    formData.assets?.cashInBank !== undefined
  );

  const isIncomeDebtsComplete = formData.incomeDebts?.monthlyIncome !== undefined;

  const isCircumstancesComplete = !!(
    formData.circumstances?.residenceType &&
    formData.circumstances?.transportationType &&
    formData.circumstances?.employmentStatus &&
    formData.circumstances?.educationLevel
  );

  const isZakatRequestComplete = !!(
    formData.zakatRequest?.reasonForApplication &&
    formData.zakatRequest?.assistanceType &&
    formData.zakatRequest?.amountRequested
  );

  const isReferencesComplete =
    formData.references?.references && formData.references.references.length >= 2;

  const isDocumentsComplete = !!(
    formData.documents?.photoId &&
    formData.documents?.ssnCard &&
    formData.documents?.acknowledgement
  );

  const allSectionsComplete =
    isDemographicsComplete &&
    isContactComplete &&
    isAssetsComplete &&
    isIncomeDebtsComplete &&
    isCircumstancesComplete &&
    isZakatRequestComplete &&
    isReferencesComplete &&
    isDocumentsComplete;

  return (
    <FormStep
      title="Review & Submit"
      description="Please review your application before submitting. Make sure all information is accurate and complete."
    >
      <div className="space-y-6">
        {!allSectionsComplete && (
          <Alert variant="warning">
            Some sections are incomplete. Please go back and complete all
            required fields before submitting.
          </Alert>
        )}

        {/* Application Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionSummary title="Demographics" isComplete={isDemographicsComplete}>
            <DataRow label="Name" value={formData.demographics?.fullName} />
            <DataRow label="Age" value={formData.demographics?.age} />
            <DataRow label="Gender" value={formData.demographics?.gender} />
            <DataRow label="Marital Status" value={formData.demographics?.maritalStatus} />
            <DataRow label="Primary Language" value={formData.demographics?.primaryLanguage} />
          </SectionSummary>

          <SectionSummary title="Contact Information" isComplete={isContactComplete}>
            <DataRow
              label="Address"
              value={
                formData.contact?.address
                  ? `${formData.contact.address.city}, ${formData.contact.address.state}`
                  : undefined
              }
            />
            <DataRow label="Phone" value={formData.contact?.phone} />
            <DataRow label="Email" value={formData.contact?.email} />
          </SectionSummary>

          <SectionSummary title="Household" isComplete={isHouseholdComplete}>
            <DataRow
              label="Household Members"
              value={formData.household?.members?.length || 0}
            />
            <DataRow
              label="Dependents"
              value={
                formData.household?.members?.filter((m) => m.isDependent).length || 0
              }
            />
          </SectionSummary>

          <SectionSummary title="Financial Assets" isComplete={isAssetsComplete}>
            <DataRow label="Cash on Hand" value={`$${formData.assets?.cashOnHand || 0}`} />
            <DataRow label="Cash in Bank" value={`$${formData.assets?.cashInBank || 0}`} />
            <DataRow label="Owns House" value={formData.assets?.hasHouse} />
            <DataRow label="Owns Business" value={formData.assets?.hasBusiness} />
            <DataRow label="Owns Vehicle" value={formData.assets?.hasCars} />
          </SectionSummary>

          <SectionSummary title="Income & Debts" isComplete={isIncomeDebtsComplete}>
            <DataRow
              label="Monthly Income"
              value={`$${formData.incomeDebts?.monthlyIncome || 0}`}
            />
            <DataRow
              label="Gov't Assistance"
              value={formData.incomeDebts?.receivesGovernmentAid}
            />
            <DataRow label="Total Debts" value={formData.incomeDebts?.debts?.length || 0} />
            <DataRow
              label="Monthly Expenses"
              value={formData.incomeDebts?.expenses?.length || 0}
            />
          </SectionSummary>

          <SectionSummary title="Circumstances" isComplete={isCircumstancesComplete}>
            <DataRow
              label="Residence Type"
              value={formData.circumstances?.residenceType}
            />
            <DataRow
              label="Employment"
              value={formData.circumstances?.employmentStatus}
            />
            <DataRow
              label="Health Insurance"
              value={formData.circumstances?.hasHealthInsurance}
            />
            <DataRow
              label="Education"
              value={formData.circumstances?.educationLevel}
            />
          </SectionSummary>

          <SectionSummary title="Zakat Request" isComplete={isZakatRequestComplete}>
            <DataRow
              label="Assistance Type"
              value={formData.zakatRequest?.assistanceType}
            />
            <DataRow
              label="Amount Requested"
              value={`$${formData.zakatRequest?.amountRequested || 0}`}
            />
            {formData.zakatRequest?.assistanceType === 'monthly' && (
              <DataRow
                label="Duration"
                value={`${formData.zakatRequest?.monthlyDuration || 0} months`}
              />
            )}
          </SectionSummary>

          <SectionSummary title="References" isComplete={isReferencesComplete}>
            <DataRow
              label="References Provided"
              value={formData.references?.references?.length || 0}
            />
            {formData.references?.references?.map((ref, i) => (
              <DataRow key={i} label={`Reference ${i + 1}`} value={ref.name} />
            ))}
          </SectionSummary>

          <SectionSummary title="Documents" isComplete={isDocumentsComplete}>
            <DataRow
              label="Photo ID"
              value={formData.documents?.photoId ? 'Uploaded' : 'Not uploaded'}
            />
            <DataRow
              label="SSN Card"
              value={formData.documents?.ssnCard ? 'Uploaded' : 'Not uploaded'}
            />
            <DataRow
              label="Lease Agreement"
              value={formData.documents?.leaseAgreement ? 'Uploaded' : 'Not uploaded'}
            />
            <DataRow
              label="Other Documents"
              value={formData.documents?.otherDocuments?.length || 0}
            />
          </SectionSummary>
        </div>

        {/* Previous Applications */}
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Previous Applications
          </h4>
          <div className="space-y-4">
            <Checkbox
              label="I have previously applied for Zakat assistance from MHMA"
              {...register('previousApplications.appliedToMHMA')}
            />

            {watch('previousApplications.appliedToMHMA') && (
              <div className="ml-6 space-y-2">
                <input
                  type="date"
                  {...register('previousApplications.mhmaDate')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  {...register('previousApplications.mhmaOutcome')}
                  placeholder="What was the outcome?"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Terms and Certification */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
          <h4 className="text-lg font-medium text-gray-900">
            Certification & Agreement
          </h4>

          <Checkbox
            label="I certify that all information provided in this application is true and accurate to the best of my knowledge. I understand that providing false information may result in denial of assistance and potential legal consequences."
            {...register('review.certifyAccurate')}
            error={errors.review?.certifyAccurate?.message}
            required
          />

          <Checkbox
            label="I agree to the terms and conditions of the Zakat assistance program. I understand that approval is not guaranteed and is subject to available funds and eligibility criteria."
            {...register('review.agreeToTerms')}
            error={errors.review?.agreeToTerms?.message}
            required
          />

          <Checkbox
            label="I consent to the verification of the information provided in this application. I authorize the Zakat committee to contact my references and verify my documents."
            {...register('review.consentToVerification')}
            error={errors.review?.consentToVerification?.message}
            required
          />
        </div>

        {/* Submit Note */}
        <Alert variant="info">
          After submitting, your application will be reviewed by a Zakat
          administrator. You will receive updates via email regarding the status
          of your application. If additional documents are needed, you will be
          notified.
        </Alert>
      </div>
    </FormStep>
  );
}
