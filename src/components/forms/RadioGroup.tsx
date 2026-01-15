import { forwardRef, type InputHTMLAttributes, type ChangeEvent } from 'react';
import { clsx } from 'clsx';

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  label?: string;
  options: RadioOption[];
  error?: string;
  hint?: string;
  orientation?: 'horizontal' | 'vertical';
  value?: string;
}

export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  ({ label, options, error, hint, orientation = 'vertical', className, id, name, onChange, onBlur, value, disabled, required, ...restProps }, ref) => {
    const groupId = id || name;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="form-label">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
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
                checked={value === option.value}
                disabled={option.disabled || disabled}
                onChange={handleChange}
                onBlur={onBlur}
                className={clsx(
                  'h-4 w-4 border-gray-300',
                  'text-primary-600 focus:ring-primary-500',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  error && 'border-red-500'
                )}
                {...restProps}
              />
              <label
                htmlFor={`${groupId}-${option.value}`}
                className={clsx(
                  'ml-2 text-sm text-gray-700',
                  (option.disabled || disabled) && 'cursor-not-allowed opacity-50'
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
