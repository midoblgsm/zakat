import { useFormContext } from 'react-hook-form';
import { Input } from '../../common/Input';
import { Select, Checkbox, Textarea } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import type { CircumstancesFormData } from '../../../schemas/application';

const RESIDENCE_TYPE_OPTIONS = [
  { value: 'own', label: 'Own (mortgage or paid off)' },
  { value: 'rent', label: 'Rent' },
  { value: 'shelter', label: 'Shelter or temporary housing' },
  { value: 'subsidized', label: 'Subsidized housing (Section 8, etc.)' },
  { value: 'other', label: 'Other' },
];

const TRANSPORTATION_OPTIONS = [
  { value: 'own_car', label: 'Own car' },
  { value: 'public', label: 'Public transportation' },
  { value: 'rideshare', label: 'Rideshare (Uber, Lyft, etc.)' },
  { value: 'other', label: 'Other' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'disabled', label: 'Disabled' },
];

const EDUCATION_LEVELS = [
  { value: 'none', label: 'No formal education' },
  { value: 'elementary', label: 'Elementary school' },
  { value: 'middle', label: 'Middle school' },
  { value: 'high_school', label: 'High school diploma or GED' },
  { value: 'some_college', label: 'Some college' },
  { value: 'associate', label: "Associate's degree" },
  { value: 'bachelor', label: "Bachelor's degree" },
  { value: 'master', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate degree' },
  { value: 'trade', label: 'Trade/vocational certificate' },
];

export function CircumstancesStep() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<{ circumstances: CircumstancesFormData }>();

  const residenceType = watch('circumstances.residenceType');
  const sharesRent = watch('circumstances.sharesRent');
  const employmentStatus = watch('circumstances.employmentStatus');
  const hasHealthInsurance = watch('circumstances.hasHealthInsurance');

  const showRentAmount = residenceType === 'rent' || residenceType === 'subsidized';
  const showEmployerInfo = employmentStatus === 'employed' || employmentStatus === 'self_employed';

  return (
    <FormStep
      title="Living Circumstances"
      description="Tell us about your current living and working situation."
    >
      <div className="space-y-8">
        {/* Residence Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Residence</h3>
          <div className="space-y-4">
            <Select
              label="Residence Type"
              options={RESIDENCE_TYPE_OPTIONS}
              {...register('circumstances.residenceType')}
              error={errors.circumstances?.residenceType?.message}
              placeholder="Select residence type"
              required
            />

            {residenceType === 'other' && (
              <Textarea
                label="Please describe your living situation"
                {...register('circumstances.residenceDetails')}
                error={errors.circumstances?.residenceDetails?.message}
                placeholder="Describe your current living arrangement"
              />
            )}

            {showRentAmount && (
              <Input
                label="Monthly Rent Amount ($)"
                type="number"
                {...register('circumstances.rentAmount', { valueAsNumber: true })}
                error={errors.circumstances?.rentAmount?.message}
                placeholder="0"
                min={0}
                required
              />
            )}

            <div className="border rounded-lg p-4">
              <Checkbox
                label="I share rent with others"
                {...register('circumstances.sharesRent')}
              />
              {sharesRent && (
                <div className="mt-4 pl-6">
                  <Textarea
                    label="Please explain the rent sharing arrangement"
                    {...register('circumstances.rentShareDetails')}
                    error={errors.circumstances?.rentShareDetails?.message}
                    placeholder="e.g., I split rent 50/50 with my sibling"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transportation Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transportation</h3>
          <div className="space-y-4">
            <Select
              label="Primary Transportation"
              options={TRANSPORTATION_OPTIONS}
              {...register('circumstances.transportationType')}
              error={errors.circumstances?.transportationType?.message}
              placeholder="Select transportation type"
              required
            />

            {watch('circumstances.transportationType') === 'other' && (
              <Input
                label="Please describe"
                {...register('circumstances.transportationDetails')}
                error={errors.circumstances?.transportationDetails?.message}
                placeholder="How do you get around?"
              />
            )}
          </div>
        </div>

        {/* Employment Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Employment</h3>
          <div className="space-y-4">
            <Select
              label="Employment Status"
              options={EMPLOYMENT_STATUS_OPTIONS}
              {...register('circumstances.employmentStatus')}
              error={errors.circumstances?.employmentStatus?.message}
              placeholder="Select employment status"
              required
            />

            {showEmployerInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={employmentStatus === 'self_employed' ? 'Business Name' : 'Employer Name'}
                  {...register('circumstances.employerName')}
                  error={errors.circumstances?.employerName?.message}
                  placeholder={
                    employmentStatus === 'self_employed'
                      ? 'Your business name'
                      : "Your employer's name"
                  }
                  required
                />
                <Input
                  label={employmentStatus === 'self_employed' ? 'Business Address' : 'Employer Address'}
                  {...register('circumstances.employerAddress')}
                  error={errors.circumstances?.employerAddress?.message}
                  placeholder="City, State"
                />
              </div>
            )}
          </div>
        </div>

        {/* Health Insurance Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Health Insurance</h3>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <Checkbox
                label="I have health insurance"
                {...register('circumstances.hasHealthInsurance')}
              />
              {hasHealthInsurance && (
                <div className="mt-4 pl-6">
                  <Input
                    label="Type of Insurance"
                    {...register('circumstances.healthInsuranceType')}
                    error={errors.circumstances?.healthInsuranceType?.message}
                    placeholder="e.g., Medicaid, Employer-provided, ACA Marketplace"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Education</h3>
          <Select
            label="Highest Level of Education"
            options={EDUCATION_LEVELS}
            {...register('circumstances.educationLevel')}
            error={errors.circumstances?.educationLevel?.message}
            placeholder="Select education level"
            required
          />
        </div>
      </div>
    </FormStep>
  );
}
