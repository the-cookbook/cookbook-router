import type { InterceptInput } from '../rendering/resolve-intercepts';
import type { RouterUrlBuildOptions } from '../url-state';
import type { RouterState } from './contracts';

export interface ActiveNavigationRequest {
  readonly href: string;
  readonly mode: 'push' | 'replace';
  readonly url?: RouterUrlBuildOptions;
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly preventScrollReset?: boolean;
}

export interface ActiveNavigationTracker {
  readonly getMatching: (request: ActiveNavigationRequest) => Promise<RouterState> | undefined;
  readonly start: (
    request: ActiveNavigationRequest,
    promise: Promise<RouterState>,
  ) => Promise<RouterState>;
}

interface ActiveNavigation extends ActiveNavigationRequest {
  readonly promise: Promise<RouterState>;
}

export function createActiveNavigationTracker(): ActiveNavigationTracker {
  let activeNavigation: ActiveNavigation | undefined;

  return {
    getMatching(request) {
      if (!activeNavigation || !isSameNavigation(activeNavigation, request)) {
        return undefined;
      }

      return activeNavigation.promise;
    },
    start(request, promise) {
      const navigation: ActiveNavigation = {
        ...request,
        promise,
      };
      activeNavigation = navigation;

      void promise.finally(() => {
        if (activeNavigation === navigation) {
          activeNavigation = undefined;
        }
      });

      return promise;
    },
  };
}

function isSameNavigation(
  activeNavigation: ActiveNavigation,
  request: ActiveNavigationRequest,
): boolean {
  return (
    activeNavigation.href === request.href &&
    activeNavigation.mode === request.mode &&
    activeNavigation.url === request.url &&
    activeNavigation.intercept === request.intercept &&
    activeNavigation.context === request.context &&
    activeNavigation.preventScrollReset === request.preventScrollReset
  );
}
