import { useRouterContext } from '../context/router-context';
import type { RouteHash, RouteId } from '@cookbook/router';

export function useHash<Route extends RouteId = RouteId>(
  _routeId?: Route,
): RouteHash<Route> | null {
  const hash = useRouterContext().state.location.hash;
  return (hash ? hash.slice(1) : null) as RouteHash<Route> | null;
}
