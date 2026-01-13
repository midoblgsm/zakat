import { useFormContext } from 'react-hook-form';
import { Input } from '../../common/Input';
import { Select, RadioGroup, Checkbox } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import type { DemographicsFormData } from '../../../schemas/application';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

const COMMON_LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Somali', label: 'Somali' },
  { value: 'French', label: 'French' },
  { value: 'Other', label: 'Other' },
];

export function DemographicsStep() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<{ demographics: DemographicsFormData }>();

  const hasDriverLicense = watch('demographics.hasDriverLicense');

  return (
    <FormStep
      title="Demographics"
      description="Please provide your personal information. All fields marked with * are required."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Full Name"
            {...register('demographics.fullName')}
            error={errors.demographics?.fullName?.message}
            placeholder="Enter your full legal name"
            required
          />
        </div>

        <Input
          label="Age"
          type="number"
          {...register('demographics.age', { valueAsNumber: true })}
          error={errors.demographics?.age?.message}
          placeholder="Enter your age"
          min={18}
          max={120}
          required
        />

        <Select
          label="Gender"
          options={GENDER_OPTIONS}
          {...register('demographics.gender')}
          error={errors.demographics?.gender?.message}
          placeholder="Select gender"
          required
        />

        <Select
          label="Marital Status"
          options={MARITAL_STATUS_OPTIONS}
          {...register('demographics.maritalStatus')}
          error={errors.demographics?.maritalStatus?.message}
          placeholder="Select marital status"
          required
        />

        <Input
          label="Social Security Number"
          {...register('demographics.ssn')}
          error={errors.demographics?.ssn?.message}
          placeholder="XXX-XX-XXXX"
          hint="This information is kept confidential and encrypted"
          required
        />

        <Select
          label="Primary Language"
          options={COMMON_LANGUAGES}
          {...register('demographics.primaryLanguage')}
          error={errors.demographics?.primaryLanguage?.message}
          placeholder="Select primary language"
          required
        />

        <div className="flex items-end">
          <Checkbox
            label="I speak English"
            {...register('demographics.speaksEnglish')}
            error={errors.demographics?.speaksEnglish?.message}
          />
        </div>

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Driver License Information</h3>
          <div className="space-y-4">
            <Checkbox
              label="I have a valid driver's license"
              {...register('demographics.hasDriverLicense')}
              error={errors.demographics?.hasDriverLicense?.message}
            />

            {hasDriverLicense && (
              <Input
                label="Driver License Number"
                {...register('demographics.driverLicenseNumber')}
                error={errors.demographics?.driverLicenseNumber?.message}
                placeholder="Enter your driver license number"
                required={hasDriverLicense}
              />
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <Input
            label="Associated Masjid (Optional)"
            {...register('demographics.associatedMasjid')}
            error={errors.demographics?.associatedMasjid?.message}
            placeholder="Name of masjid you regularly attend"
            hint="This helps us understand your community connection"
          />
        </div>
      </div>
    </FormStep>
  );
}
