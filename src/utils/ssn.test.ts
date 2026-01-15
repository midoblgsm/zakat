import { describe, it, expect } from 'vitest';
import {
  isValidSSN,
  isValidPartialSSN,
  formatSSN,
  maskSSN,
  validateSSNFormat,
  parseSSN,
  isCompleteSSN,
} from './ssn';

describe('SSN Utilities', () => {
  describe('isValidSSN', () => {
    it('should return true for valid SSN format', () => {
      expect(isValidSSN('123-45-6789')).toBe(true);
      expect(isValidSSN('000-00-0000')).toBe(true); // Format is valid, content validation is separate
    });

    it('should return false for invalid SSN format', () => {
      expect(isValidSSN('123456789')).toBe(false); // No dashes
      expect(isValidSSN('12-345-6789')).toBe(false); // Wrong dash positions
      expect(isValidSSN('123-456-789')).toBe(false); // Wrong groups
      expect(isValidSSN('')).toBe(false);
      expect(isValidSSN('abc-de-fghi')).toBe(false);
    });
  });

  describe('isValidPartialSSN', () => {
    it('should return true for valid partial SSNs', () => {
      expect(isValidPartialSSN('')).toBe(true);
      expect(isValidPartialSSN('1')).toBe(true);
      expect(isValidPartialSSN('12')).toBe(true);
      expect(isValidPartialSSN('123')).toBe(true);
      expect(isValidPartialSSN('123-')).toBe(true);
      expect(isValidPartialSSN('123-4')).toBe(true);
      expect(isValidPartialSSN('123-45')).toBe(true);
      expect(isValidPartialSSN('123-45-')).toBe(true);
      expect(isValidPartialSSN('123-45-6789')).toBe(true);
    });

    it('should return false for invalid partial SSNs', () => {
      expect(isValidPartialSSN('1234')).toBe(false); // More than 3 digits before dash
      expect(isValidPartialSSN('abc')).toBe(false);
    });
  });

  describe('formatSSN', () => {
    it('should format digits with dashes', () => {
      expect(formatSSN('123456789')).toBe('123-45-6789');
      expect(formatSSN('123')).toBe('123');
      expect(formatSSN('1234')).toBe('123-4');
      expect(formatSSN('12345')).toBe('123-45');
      expect(formatSSN('123456')).toBe('123-45-6');
    });

    it('should strip non-digits', () => {
      expect(formatSSN('123-45-6789')).toBe('123-45-6789');
      expect(formatSSN('1a2b3c4d5e6f7g8h9i')).toBe('123-45-6789');
    });

    it('should limit to 9 digits', () => {
      expect(formatSSN('1234567890')).toBe('123-45-6789');
      expect(formatSSN('123456789012345')).toBe('123-45-6789');
    });

    it('should handle empty string', () => {
      expect(formatSSN('')).toBe('');
    });
  });

  describe('maskSSN', () => {
    it('should mask SSN showing only last 4 digits', () => {
      expect(maskSSN('123-45-6789')).toBe('***-**-6789');
      expect(maskSSN('000-00-0000')).toBe('***-**-0000');
    });

    it('should return placeholder for encrypted values', () => {
      expect(maskSSN('{"ciphertext":"abc"}')).toBe('***-**-****');
    });

    it('should handle empty or short values', () => {
      expect(maskSSN('')).toBe('');
      expect(maskSSN('123')).toBe('***-**-****');
    });
  });

  describe('validateSSNFormat', () => {
    it('should validate correctly formatted SSNs', () => {
      expect(validateSSNFormat('123-45-6789')).toEqual({ valid: true });
      expect(validateSSNFormat('456-78-9012')).toEqual({ valid: true });
    });

    it('should reject SSN with area number 000', () => {
      const result = validateSSNFormat('000-45-6789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('area');
    });

    it('should reject SSN with group number 00', () => {
      const result = validateSSNFormat('123-00-6789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('group');
    });

    it('should reject SSN with serial number 0000', () => {
      const result = validateSSNFormat('123-45-0000');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('serial');
    });

    it('should reject SSN with area 900-999', () => {
      const result = validateSSNFormat('900-45-6789');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('area');
    });

    it('should reject known test SSN', () => {
      const result = validateSSNFormat('078-05-1120');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('test');
    });

    it('should reject empty SSN', () => {
      const result = validateSSNFormat('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject incomplete SSN', () => {
      const result = validateSSNFormat('123-45-678');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('9 digits');
    });
  });

  describe('parseSSN', () => {
    it('should remove dashes from SSN', () => {
      expect(parseSSN('123-45-6789')).toBe('123456789');
    });

    it('should handle SSN without dashes', () => {
      expect(parseSSN('123456789')).toBe('123456789');
    });
  });

  describe('isCompleteSSN', () => {
    it('should return true for complete SSN (9 digits)', () => {
      expect(isCompleteSSN('123-45-6789')).toBe(true);
      expect(isCompleteSSN('123456789')).toBe(true);
    });

    it('should return false for incomplete SSN', () => {
      expect(isCompleteSSN('123-45-678')).toBe(false);
      expect(isCompleteSSN('123-45')).toBe(false);
      expect(isCompleteSSN('')).toBe(false);
    });
  });
});
