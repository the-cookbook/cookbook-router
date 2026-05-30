import { useRouterContext } from '../context/router-context';
import type { RouteHash, RouteId } from '@cookbook/router';

/**
 * Reads the current hash fragment without the leading `#`.
 *
 * When generated contracts are registered, passing a route id narrows the hash
 * value to that route's allowed hash union.
 */
export function useHashParams<Route extends RouteId = RouteId>(
  _routeId?: Route,
): RouteHash<Route> | null {
  const hash = useRouterContext().state.location.hash;
  return (hash ? hash.slice(1) : null) as RouteHash<Route> | null;
}
