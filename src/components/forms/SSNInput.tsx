import { forwardRef, useState, useCallback, type ChangeEvent, useId } from 'react';
import { clsx } from 'clsx';
import { formatSSN, maskSSN, isValidSSN, validateSSNFormat } from '@/utils/ssn';

interface SSNInputProps {
  label?: string;
  error?: string;
  hint?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
  name?: string;
  /** If true, shows masked value when not focused */
  showMasked?: boolean;
  /** Show validation feedback */
  showValidation?: boolean;
}

/**
 * SSN Input Component with automatic formatting and masking
 * WCAG 2.1 Level AA compliant
 *
 * Features:
 * - Auto-formats as user types (XXX-XX-XXXX)
 * - Masks value when not focused (***-**-XXXX)
 * - Real-time validation feedback
 * - Screen reader announcements
 */
export const SSNInput = forwardRef<HTMLInputElement, SSNInputProps>(
  (
    {
      label = 'Social Security Number',
      error,
      hint = 'Format: XXX-XX-XXXX',
      value = '',
      onChange,
      onBlur,
      required = false,
      disabled = false,
      readOnly = false,
      className,
      id,
      name,
      showMasked = true,
      showValidation = true,
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || name || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const [isFocused, setIsFocused] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Determine display value
    const displayValue = isFocused || !showMasked || !value
      ? value
      : maskSSN(value);

    // Internal validation
    const validation = showValidation && hasInteracted && value
      ? validateSSNFormat(value)
      : { valid: true };

    const displayError = error || (!validation.valid ? validation.error : undefined);

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const formatted = formatSSN(e.target.value);
        onChange?.(formatted);
      },
      [onChange]
    );

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      setHasInteracted(true);
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      onBlur?.();
    }, [onBlur]);

    const describedBy = [
      displayError ? errorId : null,
      hint && !displayError ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    const isComplete = isValidSSN(value);

    return (
      <div className={clsx('w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {required && (
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            id={inputId}
            name={name}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder="XXX-XX-XXXX"
            maxLength={11}
            autoComplete="off"
            inputMode="numeric"
            pattern="\d{3}-\d{2}-\d{4}"
            className={clsx(
              'w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
              'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
              displayError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              isComplete && !displayError && hasInteracted && 'border-green-500'
            )}
            aria-invalid={displayError ? 'true' : undefined}
            aria-describedby={describedBy}
            aria-required={required}
          />

          {/* Status icon */}
          {hasInteracted && value && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {isComplete && !displayError ? (
                <svg
                  className="h-5 w-5 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : displayError ? (
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : null}
            </div>
          )}
        </div>

        {displayError && (
          <p id={errorId} className="form-error" role="alert">
            {displayError}
          </p>
        )}
        {hint && !displayError && (
          <p id={hintId} className="form-hint">
            {hint}
          </p>
        )}

        {/* Security notice */}
        <p className="mt-1 text-xs text-gray-400">
          <svg
            className="inline-block h-3 w-3 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Your SSN is encrypted and stored securely
        </p>
      </div>
    );
  }
);

SSNInput.displayName = 'SSNInput';
