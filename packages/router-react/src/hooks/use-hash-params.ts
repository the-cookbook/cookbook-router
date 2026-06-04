import type { MatchOptions, RouteHash, RouteId } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/** Options for reading URLKit-parsed hash state from the active route. */
export interface UseHashParamsOptions {
  /** Per-hook URLKit options overriding route-level and router-level defaults. */
  readonly url?: MatchOptions['url'];
}

/**
 * Returns the URLKit-parsed current hash fragment.
 *
 * When generated contracts are registered, passing a route id narrows the hash
 * value to that route's allowed hash union. Per-hook `url` options are accepted
 * for parity with search reads and future URLKit hash options.
 */
export function useHashParams<Route extends RouteId = RouteId>(
  routeId?: Route,
  options?: UseHashParamsOptions,
): RouteHash<Route> | null;
export function useHashParams(options?: UseHashParamsOptions): RouteHash<RouteId> | null;
export function useHashParams<Route extends RouteId = RouteId>(
  routeOrOptions?: Route | UseHashParamsOptions,
  options?: UseHashParamsOptions,
): RouteHash<Route> | RouteHash<RouteId> | null {
  const { router, state } = useRouterContext();
  const routeId = typeof routeOrOptions === 'string' ? routeOrOptions : undefined;
  const hookOptions = typeof routeOrOptions === 'string' ? options : routeOrOptions;
  const match =
    hookOptions?.url === undefined
      ? state.match
      : router.match(state.location.href, { url: hookOptions.url });

  if (!match) {
    return null;
  }

  if (routeId && !match.branch.some((entry) => entry.id === routeId)) {
    return null;
  }

  return (match.hash ?? null) as RouteHash<Route> | null;
}

/** Alias for `useHashParams`. */
export const useHash = useHashParams;
