import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type Politeness = 'polite' | 'assertive';

interface LiveRegionContextValue {
  announce: (message: string, politeness?: Politeness) => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

interface LiveRegionProviderProps {
  children: ReactNode;
}

/**
 * Provides live region announcements for screen readers (WCAG 2.1 Level A)
 * Use announce() to notify users of dynamic content changes
 */
export function LiveRegionProvider({ children }: LiveRegionProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    // Clear and re-set to ensure screen readers announce repeated messages
    if (politeness === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 100);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 100);
    }
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Polite live region - announces when user is idle */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive live region - announces immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

/**
 * Hook to access live region announcements
 * @returns {Object} Object containing announce function
 */
export function useLiveRegion(): LiveRegionContextValue {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
}
