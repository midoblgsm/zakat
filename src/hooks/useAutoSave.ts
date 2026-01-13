import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraftApplication } from '../services/application';
import type { ApplicationFormData } from '../schemas/application';

interface UseAutoSaveOptions {
  applicationId: string | null;
  formData: Partial<ApplicationFormData>;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  saveNow: () => Promise<void>;
}

/**
 * Hook for auto-saving application form data
 * Debounces saves to prevent excessive writes
 */
export function useAutoSave({
  applicationId,
  formData,
  enabled = true,
  debounceMs = 3000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Save function
  const performSave = useCallback(async () => {
    if (!applicationId || !enabled) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveDraftApplication(applicationId, formData);

      if (isMountedRef.current) {
        setLastSaved(new Date());
        previousDataRef.current = JSON.stringify(formData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save draft');
        console.error('Auto-save error:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [applicationId, formData, enabled]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!applicationId || !enabled) return;

    // Check if data has actually changed
    const currentData = JSON.stringify(formData);
    if (currentData === previousDataRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [applicationId, formData, enabled, debounceMs, performSave]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
  };
}
