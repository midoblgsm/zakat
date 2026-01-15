import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
  /** Support for indeterminate state (used in "select all" scenarios) */
  indeterminate?: boolean;
}

/**
 * Accessible checkbox component (WCAG 2.1 Level AA)
 * Supports indeterminate state, proper labeling, and error states
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, hint, indeterminate = false, className, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || props.name || generatedId;
    const errorId = `${checkboxId}-error`;
    const hintId = `${checkboxId}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint && !error ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        <div className="flex items-start">
          <input
            ref={(element) => {
              if (element) {
                element.indeterminate = indeterminate;
              }
              if (typeof ref === 'function') {
                ref(element);
              } else if (ref) {
                ref.current = element;
              }
            }}
            type="checkbox"
            id={checkboxId}
            className={clsx(
              'mt-1 h-4 w-4 rounded border-gray-300',
              'text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
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
            {props.required && (
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            )}
          </label>
        </div>
        {error && (
          <p id={errorId} className="form-error ml-6" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="form-hint ml-6">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
