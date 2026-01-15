import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '../../common/Input';
import { Select, Checkbox } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { getActiveMasajid } from '../../../services/masjid';
import type { DemographicsFormData } from '../../../schemas/application';
import type { Masjid } from '../../../types/masjid';

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

const OTHER_MASJID_VALUE = '__other__';

export function DemographicsStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<{ demographics: DemographicsFormData }>();

  const [masajid, setMasajid] = useState<Masjid[]>([]);
  const [loadingMasajid, setLoadingMasajid] = useState(true);
  const [showOtherMasjid, setShowOtherMasjid] = useState(false);

  const hasDriverLicense = watch('demographics.hasDriverLicense');
  const associatedMasjid = watch('demographics.associatedMasjid');

  // Fetch active masajid on mount
  useEffect(() => {
    async function fetchMasajid() {
      try {
        const activeMasajid = await getActiveMasajid();
        setMasajid(activeMasajid);
      } catch (err) {
        console.error('Error fetching masajid:', err);
      } finally {
        setLoadingMasajid(false);
      }
    }
    fetchMasajid();
  }, []);

  // Check if current value is "Other" or a custom value not in the list
  useEffect(() => {
    if (!loadingMasajid && associatedMasjid) {
      const isKnownMasjid = masajid.some(m => m.name === associatedMasjid);
      setShowOtherMasjid(!isKnownMasjid && associatedMasjid !== '');
    }
  }, [loadingMasajid, associatedMasjid, masajid]);

  // Build masjid options for the dropdown
  const masjidOptions = [
    ...masajid.map(m => ({ value: m.name, label: m.name })),
    { value: OTHER_MASJID_VALUE, label: 'Other (not listed)' },
  ];

  const handleMasjidChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === OTHER_MASJID_VALUE) {
      setShowOtherMasjid(true);
      setValue('demographics.associatedMasjid', '');
    } else {
      setShowOtherMasjid(false);
      setValue('demographics.associatedMasjid', value);
    }
  };

  // Determine the current dropdown value
  const getDropdownValue = () => {
    if (showOtherMasjid) return OTHER_MASJID_VALUE;
    if (!associatedMasjid) return '';
    const isKnownMasjid = masajid.some(m => m.name === associatedMasjid);
    return isKnownMasjid ? associatedMasjid : OTHER_MASJID_VALUE;
  };

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

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Masjid Association (Optional)</h3>
          <div className="space-y-4">
            <Select
              label="Associated Masjid"
              options={masjidOptions}
              value={getDropdownValue()}
              onChange={handleMasjidChange}
              error={errors.demographics?.associatedMasjid?.message}
              placeholder={loadingMasajid ? "Loading masajid..." : "Select your masjid"}
              disabled={loadingMasajid}
              hint="Select the masjid you regularly attend"
            />

            {showOtherMasjid && (
              <Input
                label="Other Masjid Name"
                {...register('demographics.associatedMasjid')}
                error={errors.demographics?.associatedMasjid?.message}
                placeholder="Enter the name of your masjid"
                hint="Please provide the name of the masjid you attend"
              />
            )}
          </div>
        </div>
      </div>
    </FormStep>
  );
}
