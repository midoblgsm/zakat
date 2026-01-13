import { useFormContext } from 'react-hook-form';
import { Input } from '../../common/Input';
import { Select } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { US_STATES } from '../../../utils/constants';
import type { ContactInfoFormData } from '../../../schemas/application';

export function ContactStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ contact: ContactInfoFormData }>();

  return (
    <FormStep
      title="Contact Information"
      description="Please provide your current contact information so we can reach you regarding your application."
    >
      <div className="space-y-6">
        {/* Address Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Street Address"
                {...register('contact.address.street')}
                error={errors.contact?.address?.street?.message}
                placeholder="123 Main Street, Apt 4B"
                required
              />
            </div>

            <Input
              label="City"
              {...register('contact.address.city')}
              error={errors.contact?.address?.city?.message}
              placeholder="Enter city"
              required
            />

            <Select
              label="State"
              options={US_STATES.map((s) => ({ value: s.value, label: s.label }))}
              {...register('contact.address.state')}
              error={errors.contact?.address?.state?.message}
              placeholder="Select state"
              required
            />

            <Input
              label="Zip Code"
              {...register('contact.address.zipCode')}
              error={errors.contact?.address?.zipCode?.message}
              placeholder="12345"
              required
            />
          </div>
        </div>

        {/* Phone & Email Section */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Phone & Email</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Primary Phone"
              type="tel"
              {...register('contact.phone')}
              error={errors.contact?.phone?.message}
              placeholder="(555) 555-5555"
              hint="We will use this number to contact you"
              required
            />

            <Input
              label="Secondary Phone (Optional)"
              type="tel"
              {...register('contact.phoneSecondary')}
              error={errors.contact?.phoneSecondary?.message}
              placeholder="(555) 555-5555"
              hint="Alternative number if we cannot reach you"
            />

            <div className="md:col-span-2">
              <Input
                label="Email Address"
                type="email"
                {...register('contact.email')}
                error={errors.contact?.email?.message}
                placeholder="your.email@example.com"
                hint="We will send application updates to this email"
                required
              />
            </div>
          </div>
        </div>
      </div>
    </FormStep>
  );
}
