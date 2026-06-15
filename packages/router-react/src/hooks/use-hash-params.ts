import type { RouteHash, RouteId } from '@cookbook/router';
import { useRouterContext } from '../provider/router-context';

type ResolvedRouteHash<Route extends RouteId> = Exclude<RouteHash<Route>, undefined> | null;

/**
 * Returns the URLKit-parsed current hash fragment.
 *
 * Returns null when there is no active match, when the requested route is not
 * active, or when the active route has no hash fragment.
 */
export function useHashParams<Route extends RouteId = RouteId>(
  routeId?: Route,
): ResolvedRouteHash<Route>;
export function useHashParams<Route extends RouteId = RouteId>(
  routeId?: Route,
): ResolvedRouteHash<Route> | ResolvedRouteHash<RouteId> {
  const { state } = useRouterContext();
  const match = state.match;

  if (!match) {
    return null;
  }

  if (routeId && !match.branch.some((entry) => entry.id === routeId)) {
    return null;
  }

  return (match.hash ?? null) as ResolvedRouteHash<Route>;
}
