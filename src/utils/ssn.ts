/**
 * SSN Utilities for Frontend
 *
 * Note: SSN encryption/decryption happens server-side only.
 * This module provides client-side validation, formatting, and masking.
 */

/**
 * SSN format regex: XXX-XX-XXXX
 */
const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;

/**
 * Partial SSN regex for input validation (while typing)
 */
const PARTIAL_SSN_REGEX = /^\d{0,3}(-\d{0,2})?(-\d{0,4})?$/;

/**
 * Validate SSN format
 */
export function isValidSSN(ssn: string): boolean {
  return SSN_REGEX.test(ssn);
}

/**
 * Validate partial SSN (for real-time input validation)
 */
export function isValidPartialSSN(value: string): boolean {
  return PARTIAL_SSN_REGEX.test(value);
}

/**
 * Format SSN with dashes as user types
 * Converts "123456789" to "123-45-6789"
 */
export function formatSSN(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Limit to 9 digits
  const trimmed = digits.slice(0, 9);

  // Format with dashes
  if (trimmed.length <= 3) {
    return trimmed;
  }
  if (trimmed.length <= 5) {
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
  }
  return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 5)}-${trimmed.slice(5)}`;
}

/**
 * Mask SSN for display - shows only last 4 digits
 * Input: "123-45-6789" -> "***-**-6789"
 */
export function maskSSN(ssn: string): string {
  if (!ssn) return '';

  // If it's an encrypted value (starts with "{"), return masked placeholder
  if (ssn.startsWith('{')) {
    return '***-**-****';
  }

  // Extract last 4 digits
  const digits = ssn.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***-**-****';
  }

  const last4 = digits.slice(-4);
  return `***-**-${last4}`;
}

/**
 * Get display value for SSN field
 * Shows masked version for saved SSNs, actual value while editing
 */
export function getSSNDisplayValue(
  ssn: string | undefined,
  isEditing: boolean,
  editValue?: string
): string {
  if (isEditing && editValue !== undefined) {
    return editValue;
  }

  if (!ssn) return '';

  return maskSSN(ssn);
}

/**
 * SSN input handler - formats input and validates
 */
export function handleSSNInput(
  value: string,
  onChange: (formatted: string) => void
): void {
  const formatted = formatSSN(value);
  onChange(formatted);
}

/**
 * Parse SSN from display format
 * Removes dashes if present
 */
export function parseSSN(ssn: string): string {
  return ssn.replace(/-/g, '');
}

/**
 * Check if SSN is complete (9 digits)
 */
export function isCompleteSSN(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '');
  return digits.length === 9;
}

/**
 * Validate SSN checksum (basic validation)
 * Note: This is a format check, not ITIN/SSN area number validation
 */
export function validateSSNFormat(ssn: string): { valid: boolean; error?: string } {
  if (!ssn) {
    return { valid: false, error: 'SSN is required' };
  }

  const digits = ssn.replace(/\D/g, '');

  if (digits.length !== 9) {
    return { valid: false, error: 'SSN must be 9 digits' };
  }

  // Check for invalid patterns (all zeros in any group)
  const area = digits.slice(0, 3);
  const group = digits.slice(3, 5);
  const serial = digits.slice(5, 9);

  if (area === '000') {
    return { valid: false, error: 'Invalid SSN area number' };
  }

  if (group === '00') {
    return { valid: false, error: 'Invalid SSN group number' };
  }

  if (serial === '0000') {
    return { valid: false, error: 'Invalid SSN serial number' };
  }

  // Check for test SSNs (900-999 are not valid)
  if (parseInt(area, 10) >= 900 && parseInt(area, 10) <= 999) {
    return { valid: false, error: 'Invalid SSN area number' };
  }

  // Check for advertising SSNs (078-05-1120, etc.)
  if (digits === '078051120') {
    return { valid: false, error: 'Invalid SSN (test number)' };
  }

  return { valid: true };
}
