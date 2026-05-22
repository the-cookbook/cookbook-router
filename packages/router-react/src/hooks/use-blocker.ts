import { useEffect } from 'react';

export interface UseBlockerOptions {
  readonly when: boolean;
  readonly message?: string;
}

export interface BlockerState {
  readonly blocked: boolean;
}

export function useBlocker(options: UseBlockerOptions): BlockerState {
  useEffect(() => {
    if (!options.when || typeof window === 'undefined') {
      return;
    }

    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = options.message ?? '';
    };

    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [options.message, options.when]);

  return { blocked: options.when };
}
