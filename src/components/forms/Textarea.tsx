import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Show character count when maxLength is set */
  showCharCount?: boolean;
}

/**
 * Accessible textarea component (WCAG 2.1 Level AA)
 * Supports character counting, validation states, and proper ARIA attributes
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, showCharCount = false, className, id, value, maxLength, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || props.name || generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;
    const charCountId = `${textareaId}-charcount`;

    const currentLength = typeof value === 'string' ? value.length : 0;
    const isNearLimit = maxLength && currentLength > maxLength * 0.9;
    const isOverLimit = maxLength && currentLength > maxLength;

    const describedBy = [
      error ? errorId : null,
      hint && !error ? hintId : null,
      showCharCount && maxLength ? charCountId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
            {props.required && (
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={clsx(
            'w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-100',
            'resize-y min-h-[100px]',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            isOverLimit && 'border-red-500',
            className
          )}
          aria-invalid={error || isOverLimit ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <div className="mt-1 flex justify-between">
          <div>
            {error && (
              <p id={errorId} className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={hintId} className="text-sm text-gray-500">
                {hint}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p
              id={charCountId}
              className={clsx(
                'text-sm',
                isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-500'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
