import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  options: RadioOption[];
  error?: string;
  hint?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  ({ label, options, error, hint, orientation = 'vertical', className, id, name, ...props }, ref) => {
    const groupId = id || name;

    return (
      <div className="w-full">
        {label && (
          <label className="form-label">
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div
          role="radiogroup"
          aria-labelledby={label ? `${groupId}-label` : undefined}
          className={clsx(
            'flex gap-4',
            orientation === 'vertical' && 'flex-col',
            orientation === 'horizontal' && 'flex-row flex-wrap',
            className
          )}
        >
          {options.map((option, index) => (
            <div key={option.value} className="flex items-center">
              <input
                ref={index === 0 ? ref : undefined}
                type="radio"
                id={`${groupId}-${option.value}`}
                name={name}
                value={option.value}
                disabled={option.disabled || props.disabled}
                className={clsx(
                  'h-4 w-4 border-gray-300',
                  'text-primary-600 focus:ring-primary-500',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  error && 'border-red-500'
                )}
                {...props}
              />
              <label
                htmlFor={`${groupId}-${option.value}`}
                className={clsx(
                  'ml-2 text-sm text-gray-700',
                  (option.disabled || props.disabled) && 'cursor-not-allowed opacity-50'
                )}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        {error && (
          <p id={`${groupId}-error`} className="form-error">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${groupId}-hint`} className="form-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
