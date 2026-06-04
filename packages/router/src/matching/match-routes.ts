import { resolveSlots } from '../resolution/resolve-slots';
import type { RouterPathConstraints, RouterPathOptions } from '../pathkit/pathkit';
import type { NormalizedRoute, RouteMatch } from '../routes/contracts';
import { parseRoutePathParams } from '../url/route-url-state';
import type { RouterUrlOptions } from '../url';
import { createMatchedBranch, getRouteMatchIndex } from './route-match-index';

export interface MatchRoutesOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

export function matchRoutes(
  routes: readonly NormalizedRoute[],
  pathname: string,
  pathOptions: RouterPathOptions = {},
  options: MatchRoutesOptions = {},
): RouteMatch<string> | null {
  return matchRouteCandidates(routes, pathname, pathOptions, options)[0] ?? null;
}

export function matchRouteCandidates(
  routes: readonly NormalizedRoute[],
  pathname: string,
  pathOptions: RouterPathOptions = {},
  options: MatchRoutesOptions = {},
): readonly RouteMatch<string>[] {
  const index = getRouteMatchIndex(routes);
  const candidates: RouteMatch<string>[] = [];

  for (const route of index.rankedRoutes) {
    if (!route.fullPath) {
      continue;
    }

    const params = parseRoutePathParams(route, pathname, options);

    if (!params) {
      continue;
    }

    const branch = createMatchedBranch(route, index, params);

    candidates.push({
      id: route.id,
      pathname,
      search: {},
      hash: undefined as never,
      href: pathname,
      route,
      branch,
      params,
      slots: resolveSlots(branch, pathname, pathOptions),
    });
  }

  return candidates;
}
