import { forwardRef, useId, type InputHTMLAttributes, type ChangeEvent } from 'react';
import { clsx } from 'clsx';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
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

/**
 * Accessible radio group component (WCAG 2.1 Level AA)
 * Uses proper fieldset/legend structure for grouping
 */
export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  ({ label, options, error, hint, orientation = 'vertical', className, id, name, onChange, onBlur, value, disabled, required, ...restProps }, ref) => {
    const generatedId = useId();
    const groupId = id || name || generatedId;
    const errorId = `${groupId}-error`;
    const hintId = `${groupId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint && !error ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <fieldset className="w-full" disabled={disabled}>
        {label && (
          <legend className="form-label">
            {label}
            {required && (
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            )}
          </legend>
        )}
        <div
          role="radiogroup"
          aria-required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={clsx(
            'flex gap-4 mt-2',
            orientation === 'vertical' && 'flex-col',
            orientation === 'horizontal' && 'flex-row flex-wrap',
            className
          )}
        >
          {options.map((option, index) => (
            <div key={option.value} className="flex items-start">
              <div className="flex h-6 items-center">
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
                    'text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-red-500'
                  )}
                  {...restProps}
                />
              </div>
              <div className="ml-3">
                <label
                  htmlFor={`${groupId}-${option.value}`}
                  className={clsx(
                    'text-sm font-medium text-gray-700',
                    (option.disabled || disabled) && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-sm text-gray-500">{option.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && (
          <p id={errorId} className="form-error mt-2" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="form-hint mt-2">
            {hint}
          </p>
        )}
      </fieldset>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
