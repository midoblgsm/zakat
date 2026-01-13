import { useFormContext, useFieldArray } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { Select } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import { US_STATES } from '../../../utils/constants';
import type { ReferencesFormData } from '../../../schemas/application';

const COMMON_RELATIONSHIPS = [
  'Imam',
  'Community Leader',
  'Family Friend',
  'Neighbor',
  'Coworker',
  'Teacher',
  'Social Worker',
  'Other',
];

export function ReferencesStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<{ references: ReferencesFormData }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'references.references',
  });

  const addReference = () => {
    if (fields.length < 5) {
      append({
        name: '',
        phone: '',
        relationship: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
      });
    }
  };

  const canAddMore = fields.length < 5;
  const hasMinimum = fields.length >= 2;

  return (
    <FormStep
      title="References"
      description="Please provide at least 2 character references who can vouch for your situation. These should be non-family members who know you well."
    >
      <div className="space-y-6">
        {/* Reference requirement note */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Requirements:</strong> At least 2 references are required.
            References should be community members, religious leaders, or
            other individuals who can speak to your character and situation.
            Family members should not be listed as references.
          </p>
        </div>

        {/* References list */}
        {fields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No references added yet.</p>
            <Button type="button" variant="primary" onClick={addReference}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add First Reference
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-700">
                    Reference #{index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={fields.length <= 2}
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    {...register(`references.references.${index}.name`)}
                    error={errors.references?.references?.[index]?.name?.message}
                    placeholder="Enter full name"
                    required
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    {...register(`references.references.${index}.phone`)}
                    error={errors.references?.references?.[index]?.phone?.message}
                    placeholder="(555) 555-5555"
                    required
                  />

                  <Input
                    label="Relationship"
                    {...register(`references.references.${index}.relationship`)}
                    error={
                      errors.references?.references?.[index]?.relationship?.message
                    }
                    placeholder="e.g., Imam, Community Leader"
                    list={`relationship-options-${index}`}
                    required
                  />
                  <datalist id={`relationship-options-${index}`}>
                    {COMMON_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel} />
                    ))}
                  </datalist>

                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      {...register(`references.references.${index}.address`)}
                      error={errors.references?.references?.[index]?.address?.message}
                      placeholder="Street address"
                      required
                    />
                  </div>

                  <Input
                    label="City"
                    {...register(`references.references.${index}.city`)}
                    error={errors.references?.references?.[index]?.city?.message}
                    placeholder="City"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="State"
                      options={US_STATES.map((s) => ({
                        value: s.value,
                        label: s.label,
                      }))}
                      {...register(`references.references.${index}.state`)}
                      error={errors.references?.references?.[index]?.state?.message}
                      placeholder="State"
                      required
                    />

                    <Input
                      label="Zip Code"
                      {...register(`references.references.${index}.zipCode`)}
                      error={errors.references?.references?.[index]?.zipCode?.message}
                      placeholder="12345"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            {canAddMore && (
              <Button type="button" variant="outline" onClick={addReference}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Another Reference
              </Button>
            )}
          </div>
        )}

        {/* Validation message */}
        {!hasMinimum && fields.length > 0 && (
          <p className="text-sm text-amber-600">
            Please add at least {2 - fields.length} more reference(s) to continue.
          </p>
        )}

        {errors.references?.references?.message && (
          <p className="text-sm text-red-600">
            {errors.references.references.message}
          </p>
        )}
      </div>
    </FormStep>
  );
}
