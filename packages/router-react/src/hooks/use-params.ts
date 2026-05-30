import { useRouteRenderContext, useRouterContext } from '../context/router-context';
import type { RouteId, RouteParams } from '@cookbook/router';

/**
 * Reads route params for the current render context or active match.
 *
 * Passing a route id narrows the result through generated params contracts.
 */
export function useParams<Route extends RouteId>(routeId: Route): RouteParams<Route>;
export function useParams(): RouteParams<RouteId>;
export function useParams<Route extends RouteId>(
  routeId?: Route,
): RouteParams<Route> | RouteParams<RouteId> {
  const localMatch = useRouteRenderContext()?.match;
  const match = useRouterContext().state.match;

  if (routeId && localMatch?.id === routeId) {
    return localMatch.params as RouteParams<Route>;
  }

  if (!routeId && localMatch) {
    return localMatch.params as RouteParams<Route>;
  }

  if (!match) {
    return {} as RouteParams<Route>;
  }

  if (!routeId) {
    return match.params as RouteParams<Route>;
  }

  const branchMatch = match.branch.find((entry) => entry.id === routeId);
  return (branchMatch?.params ?? match.params) as RouteParams<Route>;
}
