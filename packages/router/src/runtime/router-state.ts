import type { RouterLocation } from '../history/memory-history';
import type { ResolvedInterceptedRoute } from '../route-config/contracts';
import type { MatchLocationResult } from '../matching/match-location';
import type { RouterNavigationState } from '../transition/run-transition';
import type { RouterUrlBuildOptions } from '../url-state';
import type { RouterState } from './contracts';

export interface CreateRouterStateOptions {
  readonly location: RouterLocation;
  readonly navigation: RouterNavigationState;
  readonly error?: unknown;
  readonly intercepted?: ResolvedInterceptedRoute;
  readonly previousLocation?: RouterLocation;
  readonly callUrl?: RouterUrlBuildOptions;
  readonly matchHrefResult: (href: string, callUrl?: RouterUrlBuildOptions) => MatchLocationResult;
}

export function createRouterState(options: CreateRouterStateOptions): RouterState {
  const baseMatchResult = options.matchHrefResult(options.location.href, options.callUrl);
  const baseMatch = baseMatchResult.status === 'no-match' ? null : baseMatchResult.match;
  const match =
    options.intercepted && baseMatch
      ? { ...baseMatch, intercepted: options.intercepted }
      : baseMatch;
  const next: RouterState = {
    location: options.location,
    match,
    navigation: options.navigation,
    ...(options.previousLocation === undefined
      ? {}
      : { previousLocation: options.previousLocation }),
  };
  const stateError =
    options.error ?? (baseMatchResult.status === 'error' ? baseMatchResult.error : undefined);

  if (stateError !== undefined) {
    return { ...next, error: stateError };
  }

  return next;
}
