import { useFormContext, useFieldArray } from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Input } from '../../common/Input';
import { Button } from '../../common/Button';
import { Select, Checkbox, Textarea } from '../../forms';
import { FormStep } from '../../forms/FormStep';
import type { IncomeDebtsFormData } from '../../../schemas/application';

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const EXPENSE_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semester', label: 'Semester' },
];

const COMMON_EXPENSE_CATEGORIES = [
  'Rent/Mortgage',
  'Utilities',
  'Food/Groceries',
  'Transportation',
  'Healthcare',
  'Insurance',
  'Education',
  'Childcare',
  'Phone/Internet',
  'Other',
];

export function IncomeDebtsStep() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<{ incomeDebts: IncomeDebtsFormData }>();

  const receivesGovernmentAid = watch('incomeDebts.receivesGovernmentAid');

  const {
    fields: debtFields,
    append: appendDebt,
    remove: removeDebt,
  } = useFieldArray({
    control,
    name: 'incomeDebts.debts',
  });

  const {
    fields: expenseFields,
    append: appendExpense,
    remove: removeExpense,
  } = useFieldArray({
    control,
    name: 'incomeDebts.expenses',
  });

  const addDebt = () => {
    appendDebt({
      amount: 0,
      lender: '',
      paymentFrequency: 'monthly',
      purpose: '',
    });
  };

  const addExpense = () => {
    appendExpense({
      category: '',
      amount: 0,
      frequency: 'monthly',
    });
  };

  return (
    <FormStep
      title="Income & Debts"
      description="Please provide details about your income, debts, and monthly expenses."
    >
      <div className="space-y-8">
        {/* Income Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Income</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Monthly Income ($)"
              type="number"
              {...register('incomeDebts.monthlyIncome', { valueAsNumber: true })}
              error={errors.incomeDebts?.monthlyIncome?.message}
              placeholder="0"
              min={0}
              hint="Total monthly income from all sources"
              required
            />

            <Input
              label="Income Source"
              {...register('incomeDebts.incomeSource')}
              error={errors.incomeDebts?.incomeSource?.message}
              placeholder="e.g., Employment, Self-employment, Retirement"
            />
          </div>

          <div className="mt-4 border rounded-lg p-4">
            <Checkbox
              label="I receive government assistance (SNAP, SSI, Medicaid, etc.)"
              {...register('incomeDebts.receivesGovernmentAid')}
            />
            {receivesGovernmentAid && (
              <div className="mt-4 pl-6">
                <Textarea
                  label="Please describe the assistance you receive"
                  {...register('incomeDebts.governmentAidDetails')}
                  error={errors.incomeDebts?.governmentAidDetails?.message}
                  placeholder="e.g., SNAP benefits of $200/month, SSI of $800/month"
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* Debts Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Debts</h3>

          {debtFields.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-3">No debts listed</p>
              <Button type="button" variant="outline" size="sm" onClick={addDebt}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Debt
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {debtFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Debt #{index + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDebt(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Amount Owed ($)"
                      type="number"
                      {...register(`incomeDebts.debts.${index}.amount`, {
                        valueAsNumber: true,
                      })}
                      error={errors.incomeDebts?.debts?.[index]?.amount?.message}
                      placeholder="0"
                      min={0}
                      required
                    />
                    <Input
                      label="Lender/Creditor"
                      {...register(`incomeDebts.debts.${index}.lender`)}
                      error={errors.incomeDebts?.debts?.[index]?.lender?.message}
                      placeholder="e.g., Bank of America, Medical Center"
                      required
                    />
                    <Select
                      label="Payment Frequency"
                      options={PAYMENT_FREQUENCY_OPTIONS}
                      {...register(`incomeDebts.debts.${index}.paymentFrequency`)}
                      error={errors.incomeDebts?.debts?.[index]?.paymentFrequency?.message}
                      required
                    />
                    <Input
                      label="Purpose"
                      {...register(`incomeDebts.debts.${index}.purpose`)}
                      error={errors.incomeDebts?.debts?.[index]?.purpose?.message}
                      placeholder="e.g., Medical bills, Car loan, Student loan"
                      required
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDebt}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Another Debt
              </Button>
            </div>
          )}
        </div>

        {/* Expenses Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Expenses</h3>

          {expenseFields.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-3">No expenses listed</p>
              <Button type="button" variant="outline" size="sm" onClick={addExpense}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex gap-4 items-start"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="Category"
                      {...register(`incomeDebts.expenses.${index}.category`)}
                      error={errors.incomeDebts?.expenses?.[index]?.category?.message}
                      placeholder="e.g., Rent, Utilities"
                      list={`expense-category-${index}`}
                      required
                    />
                    <datalist id={`expense-category-${index}`}>
                      {COMMON_EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    <Input
                      label="Amount ($)"
                      type="number"
                      {...register(`incomeDebts.expenses.${index}.amount`, {
                        valueAsNumber: true,
                      })}
                      error={errors.incomeDebts?.expenses?.[index]?.amount?.message}
                      placeholder="0"
                      min={0}
                      required
                    />
                    <Select
                      label="Frequency"
                      options={EXPENSE_FREQUENCY_OPTIONS}
                      {...register(`incomeDebts.expenses.${index}.frequency`)}
                      error={errors.incomeDebts?.expenses?.[index]?.frequency?.message}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExpense(index)}
                    className="text-red-600 hover:text-red-700 mt-6"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addExpense}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Another Expense
              </Button>
            </div>
          )}
        </div>
      </div>
    </FormStep>
  );
}
