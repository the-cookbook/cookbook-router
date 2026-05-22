import { matchPathPattern, type RouterPathOptions } from '../pathkit/pathkit';
import { resolveSlots } from '../resolution/resolve-slots';
import type { NormalizedRoute, RouteMatch } from '../routes/contracts';
import { createMatchedBranch, getRouteMatchIndex } from './route-match-index';

export function matchRoutes(
  routes: readonly NormalizedRoute[],
  pathname: string,
  pathOptions: RouterPathOptions = {},
): RouteMatch | null {
  const index = getRouteMatchIndex(routes);

  for (const route of index.rankedRoutes) {
    if (!route.fullPath) {
      continue;
    }

    const params = matchPathPattern(route.fullPath, pathname, pathOptions);

    if (!params) {
      continue;
    }

    const branch = createMatchedBranch(route, index, params);

    return {
      id: route.id,
      pathname,
      route,
      branch,
      params,
      slots: resolveSlots(branch, pathname, pathOptions),
    };
  }

  return null;
}
