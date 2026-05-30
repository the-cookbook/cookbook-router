import { useEffect } from 'react';
import { useRouterContext } from '../context/router-context';

/** Options controlling when `useBlocker` should prevent navigation. */
export interface UseBlockerOptions {
  readonly when: boolean;
  readonly message?: string;
}

/** Current blocker status returned by `useBlocker`. */
export interface BlockerState {
  readonly blocked: boolean;
}

/**
 * Registers a router blocker while `when` is truthy.
 *
 * In the browser, `message` is also used for unload protection. Internal router
 * navigation is cancelled when the blocker returns false.
 */
export function useBlocker(options: UseBlockerOptions): BlockerState {
  const { router } = useRouterContext();

  useEffect(() => {
    if (!options.when) {
      return;
    }

    return router.block(() => {
      if (typeof window === 'undefined' || !options.message) {
        return false;
      }

      return window.confirm(options.message);
    });
  }, [options.message, options.when, router]);

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
