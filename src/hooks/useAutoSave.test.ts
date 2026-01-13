import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import type { ApplicationFormData } from '../schemas/application';

// Mock the application service
vi.mock('../services/application', () => ({
  saveDraftApplication: vi.fn(),
}));

import { saveDraftApplication } from '../services/application';

// Helper to create mock form data
const mockFormData = { demographics: { fullName: 'Test' } } as Partial<ApplicationFormData>;

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.mocked(saveDraftApplication).mockReset();
    vi.mocked(saveDraftApplication).mockResolvedValue(undefined);
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: 'app-123',
        formData: mockFormData,
        enabled: true,
        debounceMs: 1000,
      })
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.saveNow).toBe('function');
  });

  it('does not save when applicationId is null', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: null,
        formData: mockFormData,
        enabled: true,
        debounceMs: 100,
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(saveDraftApplication).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('does not save when disabled', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: 'app-123',
        formData: mockFormData,
        enabled: false,
        debounceMs: 100,
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(saveDraftApplication).not.toHaveBeenCalled();
  });

  it('saves immediately with saveNow()', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: 'app-123',
        formData: mockFormData,
        enabled: true,
        debounceMs: 5000,
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(saveDraftApplication).toHaveBeenCalledTimes(1);
    expect(saveDraftApplication).toHaveBeenCalledWith('app-123', {
      demographics: { fullName: 'Test' },
    });
  });

  it('updates lastSaved after saveNow', async () => {
    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: 'app-123',
        formData: mockFormData,
        enabled: true,
        debounceMs: 5000,
      })
    );

    expect(result.current.lastSaved).toBeNull();

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('sets error on save failure', async () => {
    vi.mocked(saveDraftApplication).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: 'app-123',
        formData: mockFormData,
        enabled: true,
        debounceMs: 5000,
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('clears error on successful save after failure', async () => {
    vi.mocked(saveDraftApplication).mockRejectedValueOnce(new Error('Network error'));
    vi.mocked(saveDraftApplication).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useAutoSave({
        applicationId: 'app-123',
        formData: mockFormData,
        enabled: true,
        debounceMs: 5000,
      })
    );

    // First save fails
    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.error).toBe('Network error');

    // Second save succeeds
    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.error).toBeNull();
  });
});
