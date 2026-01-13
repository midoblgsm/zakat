import { useFormContext, useFieldArray } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { Checkbox, Textarea } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import type { AssetsFormData } from '../../../schemas/application';

export function AssetsStep() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<{ assets: AssetsFormData }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assets.otherAssets',
  });

  const hasHouse = watch('assets.hasHouse');
  const hasBusiness = watch('assets.hasBusiness');
  const hasCars = watch('assets.hasCars');

  const addOtherAsset = () => {
    append({ value: 0, description: '' });
  };

  return (
    <FormStep
      title="Financial Assets"
      description="Please provide information about your assets. Be as accurate as possible to help us evaluate your application."
    >
      <div className="space-y-6">
        {/* House */}
        <div className="border rounded-lg p-4">
          <Checkbox
            label="I own a house or property"
            {...register('assets.hasHouse')}
          />
          {hasHouse && (
            <div className="mt-4 pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Estimated Value ($)"
                type="number"
                {...register('assets.house.value', { valueAsNumber: true })}
                error={errors.assets?.house?.value?.message}
                placeholder="0"
                min={0}
                required
              />
              <Input
                label="Description (Optional)"
                {...register('assets.house.description')}
                placeholder="e.g., Single family home, Condo"
              />
            </div>
          )}
        </div>

        {/* Business */}
        <div className="border rounded-lg p-4">
          <Checkbox
            label="I own a business"
            {...register('assets.hasBusiness')}
          />
          {hasBusiness && (
            <div className="mt-4 pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Estimated Value ($)"
                type="number"
                {...register('assets.business.value', { valueAsNumber: true })}
                error={errors.assets?.business?.value?.message}
                placeholder="0"
                min={0}
                required
              />
              <Input
                label="Description"
                {...register('assets.business.description')}
                placeholder="e.g., Restaurant, Retail store"
              />
            </div>
          )}
        </div>

        {/* Cars */}
        <div className="border rounded-lg p-4">
          <Checkbox
            label="I own one or more vehicles"
            {...register('assets.hasCars')}
          />
          {hasCars && (
            <div className="mt-4 pl-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Total Estimated Value ($)"
                type="number"
                {...register('assets.cars.value', { valueAsNumber: true })}
                error={errors.assets?.cars?.value?.message}
                placeholder="0"
                min={0}
                required
              />
              <Input
                label="Description"
                {...register('assets.cars.description')}
                placeholder="e.g., 2018 Toyota Camry, 2020 Honda Civic"
              />
            </div>
          )}
        </div>

        {/* Cash */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Cash & Savings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cash on Hand ($)"
              type="number"
              {...register('assets.cashOnHand', { valueAsNumber: true })}
              error={errors.assets?.cashOnHand?.message}
              placeholder="0"
              min={0}
              hint="Physical cash you currently have"
              required
            />
            <Input
              label="Cash in Bank ($)"
              type="number"
              {...register('assets.cashInBank', { valueAsNumber: true })}
              error={errors.assets?.cashInBank?.message}
              placeholder="0"
              min={0}
              hint="Total of all bank accounts"
              required
            />
          </div>
        </div>

        {/* Other Assets */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Other Assets</h3>

          {fields.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-sm mb-2">
                No other assets listed
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={addOtherAsset}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Other Asset
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-gray-50 rounded p-3 flex gap-4 items-start"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Value ($)"
                      type="number"
                      {...register(`assets.otherAssets.${index}.value`, {
                        valueAsNumber: true,
                      })}
                      error={errors.assets?.otherAssets?.[index]?.value?.message}
                      placeholder="0"
                      min={0}
                    />
                    <Input
                      label="Description"
                      {...register(`assets.otherAssets.${index}.description`)}
                      placeholder="e.g., Jewelry, Investments"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 mt-6"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={addOtherAsset}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Another Asset
              </Button>
            </div>
          )}
        </div>

        {/* Nisab Information */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <h4 className="text-sm font-medium text-amber-900 mb-2">
            About Zakat Eligibility
          </h4>
          <p className="text-sm text-amber-700">
            Zakat is typically for those whose assets fall below the Nisab threshold
            (approximately $7,630 USD, based on current gold/silver prices). However,
            each case is evaluated individually considering all circumstances.
          </p>
        </div>
      </div>
    </FormStep>
  );
}
