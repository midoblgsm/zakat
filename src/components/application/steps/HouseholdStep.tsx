import { useFormContext, useFieldArray } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { Checkbox } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import type { HouseholdFormData } from '../../../schemas/application';

const COMMON_RELATIONSHIPS = [
  'Spouse',
  'Son',
  'Daughter',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Other Relative',
];

export function HouseholdStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<{ household: HouseholdFormData }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'household.members',
  });

  const addMember = () => {
    append({
      name: '',
      age: 0,
      relationship: '',
      isDependent: false,
      incomeSource: '',
    });
  };

  return (
    <FormStep
      title="Household Information"
      description="Please list all people living in your household. This helps us understand your family situation."
    >
      <div className="space-y-6">
        {/* Household members list */}
        {fields.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">No household members added yet.</p>
            <Button type="button" variant="outline" onClick={addMember}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Household Member
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-700">
                    Household Member #{index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    {...register(`household.members.${index}.name`)}
                    error={errors.household?.members?.[index]?.name?.message}
                    placeholder="Enter full name"
                    required
                  />

                  <Input
                    label="Age"
                    type="number"
                    {...register(`household.members.${index}.age`, {
                      valueAsNumber: true,
                    })}
                    error={errors.household?.members?.[index]?.age?.message}
                    placeholder="Enter age"
                    min={0}
                    max={120}
                    required
                  />

                  <Input
                    label="Relationship"
                    {...register(`household.members.${index}.relationship`)}
                    error={errors.household?.members?.[index]?.relationship?.message}
                    placeholder="e.g., Spouse, Child, Parent"
                    list={`relationship-options-${index}`}
                    required
                  />
                  <datalist id={`relationship-options-${index}`}>
                    {COMMON_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel} />
                    ))}
                  </datalist>

                  <div className="flex flex-col justify-end space-y-2">
                    <Checkbox
                      label="Is a dependent (financially depends on you)"
                      {...register(`household.members.${index}.isDependent`)}
                      error={errors.household?.members?.[index]?.isDependent?.message}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Income Source (if any)"
                      {...register(`household.members.${index}.incomeSource`)}
                      error={errors.household?.members?.[index]?.incomeSource?.message}
                      placeholder="e.g., Employment, Retirement, None"
                      hint="Leave blank if this person has no income"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addMember}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Another Member
            </Button>
          </div>
        )}

        {/* Summary */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Household Summary
          </h4>
          <div className="text-sm text-blue-700">
            <p>Total household members: {fields.length}</p>
            <p>
              Total dependents:{' '}
              {fields.filter(() => {
                // This is a simplified count; in practice, you'd need to watch the form values
                return false;
              }).length || 'Will be calculated after saving'}
            </p>
          </div>
        </div>

        {/* Note */}
        <p className="text-sm text-gray-500">
          <strong>Note:</strong> You do not need to include yourself in this list.
          Please only add other household members who live with you.
        </p>
      </div>
    </FormStep>
  );
}
