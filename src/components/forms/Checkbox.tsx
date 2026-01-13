import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const checkboxId = id || props.name;

    return (
      <div className="w-full">
        <div className="flex items-start">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={clsx(
              'mt-1 h-4 w-4 rounded border-gray-300',
              'text-primary-600 focus:ring-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${checkboxId}-error` : hint ? `${checkboxId}-hint` : undefined
            }
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={clsx(
              'ml-2 text-sm text-gray-700',
              props.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        </div>
        {error && (
          <p id={`${checkboxId}-error`} className="form-error ml-6">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${checkboxId}-hint`} className="form-hint ml-6">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
