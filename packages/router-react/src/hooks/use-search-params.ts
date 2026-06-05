import type { RouteId, RouteSearch } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/**
 * Returns URLKit-parsed search values for the current match.
 *
 * Passing a route id narrows the result through generated search contracts.
 * The hook reads already-resolved router state and does not accept URL options;
 * configure URL resolution policies at router, route, match, or static-router
 * level instead.
 */
export function useSearchParams<Route extends RouteId>(routeId: Route): RouteSearch<Route>;
export function useSearchParams(): RouteSearch<RouteId>;
export function useSearchParams<Route extends RouteId>(
  routeId?: Route,
): RouteSearch<Route> | RouteSearch<RouteId> {
  const { state } = useRouterContext();
  const match = state.match;

  if (!match) {
    return {} as RouteSearch<Route>;
  }

  if (routeId && !match.branch.some((entry) => entry.id === routeId)) {
    return {} as RouteSearch<Route>;
  }

  return match.search as RouteSearch<Route>;
}

/** Alias for `useSearchParams`. */
export const useSearch = useSearchParams;
