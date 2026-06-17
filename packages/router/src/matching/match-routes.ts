import { resolveSlots } from '../rendering/resolve-slots';
import type { RouterPathConstraints } from '../path/constraints';
import type { RouterPathOptions } from '../path/options';
import type { MatchedRoute, NormalizedRoute, RouteMatch } from '../route-config/contracts';
import { parseRoutePathParams, type RouteUrlStateOptions } from '../url-state/route-url-state';
import type { RouterUrlOptions } from '../url-state/contracts';
import {
  createRouteUrlContractStore,
  type RouteUrlContractStore,
} from '../url-state/route-url-contract-store';
import { createMatchedBranch, getRouteMatchIndex } from './route-match-index';

export interface MatchRoutesOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routeUrlContracts?: RouteUrlContractStore;
}

export interface RoutePathCandidate {
  readonly id: string;
  readonly pathname: string;
  readonly route: NormalizedRoute;
  readonly branch: readonly MatchedRoute[];
  readonly params: Record<string, unknown>;
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
  const routeUrlContracts = resolveRouteUrlContractStore(options);
  const routeUrlStateOptions = createRouteUrlStateOptions(options, routeUrlContracts);

  return matchRoutePathCandidates(routes, pathname, options, routeUrlContracts).map(
    (candidate) => ({
      ...candidate,
      search: {},
      hash: undefined as never,
      href: pathname,
      slots: resolveSlots(candidate.branch, pathname, pathOptions, routeUrlStateOptions),
    }),
  );
}

export function matchRoutePathCandidates(
  routes: readonly NormalizedRoute[],
  pathname: string,
  options: MatchRoutesOptions = {},
  routeUrlContracts: RouteUrlContractStore = resolveRouteUrlContractStore(options),
): readonly RoutePathCandidate[] {
  const index = getRouteMatchIndex(routes);
  const candidates: RoutePathCandidate[] = [];
  const routeUrlStateOptions = createRouteUrlStateOptions(options, routeUrlContracts);

  for (const route of index.rankedRoutes) {
    if (!route.fullPath) {
      continue;
    }

    const params = parseRoutePathParams(route, pathname, routeUrlStateOptions);

    if (!params) {
      continue;
    }

    candidates.push({
      id: route.id,
      pathname,
      route,
      branch: createMatchedBranch(route, index, params),
      params,
    });
  }

  return candidates;
}

export function createRouteUrlStateOptions(
  options: MatchRoutesOptions,
  contractStore: RouteUrlContractStore,
): RouteUrlStateOptions {
  const routeUrlStateOptions: {
    routerUrl?: RouterUrlOptions;
    callUrl?: RouterUrlOptions;
    pathConstraints?: RouterPathConstraints;
    contractStore: RouteUrlContractStore;
  } = { contractStore };

  if (options.routerUrl !== undefined) {
    routeUrlStateOptions.routerUrl = options.routerUrl;
  }

  if (options.callUrl !== undefined) {
    routeUrlStateOptions.callUrl = options.callUrl;
  }

  if (options.pathConstraints !== undefined) {
    routeUrlStateOptions.pathConstraints = options.pathConstraints;
  }

  return routeUrlStateOptions;
}

export function resolveRouteUrlContractStore(options: MatchRoutesOptions): RouteUrlContractStore {
  if (options.routeUrlContracts) {
    return options.routeUrlContracts;
  }

  const storeOptions: {
    routerUrl?: RouterUrlOptions;
    pathConstraints?: RouterPathConstraints;
  } = {};

  if (options.routerUrl !== undefined) {
    storeOptions.routerUrl = options.routerUrl;
  }

  if (options.pathConstraints !== undefined) {
    storeOptions.pathConstraints = options.pathConstraints;
  }

  return createRouteUrlContractStore(storeOptions);
}
