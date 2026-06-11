import type { MatchedRoute, RouteView } from '../route-config/contracts';
import type { InheritedViewFallbacks, ResolvedRouteFallback } from './contracts';

export function resolveLayoutFallbacks<View = RouteView>(
  match: MatchedRoute,
  inheritedFallbacks: InheritedViewFallbacks<View>,
): InheritedViewFallbacks<View> {
  const loading = resolveLayoutLoading(match) ?? inheritedFallbacks.loading;
  const error = resolveLayoutErrorFallback(match) ?? inheritedFallbacks.error;

  return {
    ...(loading === undefined ? {} : { loading: loading as ResolvedRouteFallback<View> }),
    ...(error === undefined ? {} : { error: error as ResolvedRouteFallback<View> }),
  };
}

export function resolveBoundaryFallbacks<View = RouteView>(
  match: MatchedRoute,
  layoutFallbacks: InheritedViewFallbacks<View>,
  isLeafMatch: boolean,
): InheritedViewFallbacks<View> {
  const routeLoading = isLeafMatch ? resolveRouteLoading(match) : undefined;
  const routeError = isLeafMatch ? resolveRouteErrorFallback(match) : undefined;
  const loading = routeLoading ?? layoutFallbacks.loading;
  const error = routeError ?? layoutFallbacks.error;

  return {
    ...(loading === undefined ? {} : { loading: loading as ResolvedRouteFallback<View> }),
    ...(error === undefined ? {} : { error: error as ResolvedRouteFallback<View> }),
  };
}

export function resolveRouteLoading(match: MatchedRoute): ResolvedRouteFallback | undefined {
  const view = match.route.route.loading;
  return view === undefined ? undefined : { view, match, source: 'route' };
}

export function resolveLayoutLoading(match: MatchedRoute): ResolvedRouteFallback | undefined {
  const view = match.route.route.layout?.loading;
  return view === undefined ? undefined : { view, match, source: 'layout' };
}

export function resolveRouteErrorFallback(match: MatchedRoute): ResolvedRouteFallback | undefined {
  const view = match.route.route.error;
  return view === undefined ? undefined : { view, match, source: 'route' };
}

export function resolveLayoutErrorFallback(match: MatchedRoute): ResolvedRouteFallback | undefined {
  const view = match.route.route.layout?.error;
  return view === undefined ? undefined : { view, match, source: 'layout' };
}
