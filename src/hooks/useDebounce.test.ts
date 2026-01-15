import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback, useThrottledCallback } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated' });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Rapid updates
    rerender({ value: 'update1' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'update2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'update3' });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Wait for debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should have final value
    expect(result.current).toBe('update3');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call the debounced function multiple times
    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Callback should be called once with last args
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg3');
  });

  it('should clear timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('arg');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute callback immediately on first call', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 300));

    act(() => {
      result.current('arg1');
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should throttle subsequent calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 300));

    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });

    // Only first call should have executed
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should allow call after delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 300));

    act(() => {
      result.current('arg1');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current('arg2');
    });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('arg2');
  });
});
