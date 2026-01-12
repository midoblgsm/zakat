import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
  it('should merge simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const showBar = true;
    const showBaz = false;
    expect(cn('foo', showBar && 'bar', showBaz && 'baz')).toBe('foo bar');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should merge conflicting Tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('mt-2', 'mt-4')).toBe('mt-4');
  });

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('should handle empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('should return empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});
