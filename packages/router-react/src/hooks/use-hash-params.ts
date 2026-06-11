import type { RouteHash, RouteId } from '@cookbook/router';
import { useRouterContext } from '../provider/router-context';

/**
 * Returns the URLKit-parsed current hash fragment.
 *
 * When generated contracts are registered, passing a route id narrows the hash
 * value to that route's allowed hash union. The hook reads already-resolved
 * router state and does not accept URL options; configure URL resolution
 * policies at router, route, match, or static-router level instead.
 */
export function useHashParams<Route extends RouteId = RouteId>(
  routeId?: Route,
): RouteHash<Route> | null;
export function useHashParams<Route extends RouteId = RouteId>(
  routeId?: Route,
): RouteHash<Route> | RouteHash<RouteId> | null {
  const { state } = useRouterContext();
  const match = state.match;

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
