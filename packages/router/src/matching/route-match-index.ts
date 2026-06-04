import type { MatchedRoute, NormalizedRoute, RankedRoute } from '../routes/contracts';
import { flattenRoutes, rankRoutes } from './rank-routes';

export interface RouteMatchIndex {
  readonly rankedRoutes: readonly RankedRoute[];
  readonly flatRoutes: readonly NormalizedRoute[];
  readonly routesById: ReadonlyMap<string, NormalizedRoute>;
}

const indexCache = new WeakMap<readonly NormalizedRoute[], RouteMatchIndex>();

export function getRouteMatchIndex(routes: readonly NormalizedRoute[]): RouteMatchIndex {
  const cached = indexCache.get(routes);

  if (cached) {
    return cached;
  }

  const flatRoutes = flattenRoutes(routes);
  const routesById = new Map<string, NormalizedRoute>();

  for (const route of flatRoutes) {
    routesById.set(route.id, route);
  }

  const index = {
    rankedRoutes: rankRoutes(routes),
    flatRoutes,
    routesById,
  } satisfies RouteMatchIndex;

  indexCache.set(routes, index);
  return index;
}

export function createMatchedBranch(
  route: NormalizedRoute,
  index: Pick<RouteMatchIndex, 'routesById'>,
  params: Record<string, unknown>,
): readonly MatchedRoute[] {
  const branch: MatchedRoute[] = [];
  let current: NormalizedRoute | undefined = route;

  while (current) {
    branch.unshift({ id: current.id, route: current, params: pickParams(params, current.params) });
    current = current.parentId ? index.routesById.get(current.parentId) : undefined;
  }

  return branch;
}

function pickParams(
  params: Record<string, unknown>,
  definitions: NormalizedRoute['params'],
): Record<string, unknown> {
  const selected: Record<string, unknown> = {};

  for (const definition of definitions) {
    const value = params[definition.name];

    if (value !== undefined) {
      selected[definition.name] = value;
    }
  }

  return selected;
}
