import type { RouterPathOptions } from '../path/options';
import { parseRoutePathParams, type RouteUrlStateOptions } from '../url-state/route-url-state';
import type {
  MatchedRoute,
  NormalizedRouteSlotConfig,
  ResolvedSlot,
  ResolvedSlots,
} from '../route-config/contracts';
import { createMatchedBranch, getRouteMatchIndex } from '../matching/route-match-index';

/**
 * Resolves all slots owned by the active matched branch.
 *
 * Each slot becomes matched content, fallback content, empty, disabled, or
 * not-found state depending on the active pathname and slot configuration.
 */
export function resolveSlots(
  branch: readonly MatchedRoute[],
  pathname: string,
  pathOptions: RouterPathOptions = {},
  urlOptions: RouteUrlStateOptions = {},
): ResolvedSlots {
  const resolved: Record<string, Record<string, ResolvedSlot>> = {};

  for (let index = 0; index < branch.length; index++) {
    const owner = branch[index];
    const slots = owner?.route.layout?.slots;

    if (!owner || !slots) {
      continue;
    }

    for (const [slotName, slotConfig] of Object.entries(slots)) {
      const ownerSlots = (resolved[owner.id] ??= {});
      ownerSlots[slotName] = resolveSlot(
        owner,
        slotName,
        slotConfig,
        branch,
        index,
        pathname,
        pathOptions,
        urlOptions,
      );
    }
  }

  return resolved;
}

/**
 * Reads one resolved slot by owner route id and slot name.
 */
export function getResolvedSlot(
  slots: ResolvedSlots,
  ownerRouteId: string,
  slotName: string,
): ResolvedSlot | undefined {
  return slots[ownerRouteId]?.[slotName];
}

function resolveSlot(
  owner: MatchedRoute,
  slotName: string,
  initialConfig: NormalizedRouteSlotConfig,
  branch: readonly MatchedRoute[],
  ownerIndex: number,
  pathname: string,
  pathOptions: RouterPathOptions,
  urlOptions: RouteUrlStateOptions,
): ResolvedSlot {
  const config = getEffectiveSlotConfig(initialConfig, slotName, branch, ownerIndex);

  if (config.disabled) {
    return {
      ownerRouteId: owner.id,
      name: slotName,
      status: 'disabled',
      config,
      params: owner.params,
    };
  }

  const matchedSlotRoute = matchSlotRoute(config, pathname, pathOptions, urlOptions);

  if (matchedSlotRoute) {
    return {
      ownerRouteId: owner.id,
      name: slotName,
      status: 'matched',
      config,
      match: matchedSlotRoute.match,
      branch: matchedSlotRoute.branch,
      params: matchedSlotRoute.match.params,
      ...(matchedSlotRoute.match.route.route.meta === undefined
        ? {}
        : { meta: matchedSlotRoute.match.route.route.meta }),
      ...(matchedSlotRoute.match.route.view === undefined
        ? {}
        : { view: matchedSlotRoute.match.route.view }),
    };
  }

  if (config.fallback && config.fallback.view) {
    return {
      ownerRouteId: owner.id,
      name: slotName,
      status: 'fallback',
      config,
      fallback: config.fallback,
      params: owner.params,
      ...(config.fallback.meta === undefined ? {} : { meta: config.fallback.meta }),
      view: config.fallback.view,
    };
  }

  return {
    ownerRouteId: owner.id,
    name: slotName,
    status: 'empty',
    config,
    params: owner.params,
    ...(config.meta === undefined ? {} : { meta: config.meta }),
  };
}

function getEffectiveSlotConfig(
  initialConfig: NormalizedRouteSlotConfig,
  slotName: string,
  branch: readonly MatchedRoute[],
  ownerIndex: number,
): NormalizedRouteSlotConfig {
  let config = initialConfig;

  for (let index = ownerIndex + 1; index < branch.length; index++) {
    const descendant = branch[index]?.route;

    if (!descendant) {
      continue;
    }

    const descendantSlot = descendant.layout?.slots?.[slotName];

    if (!descendantSlot) {
      continue;
    }

    if (descendant.layout?.view && descendantSlot.ownerRouteId === descendant.id) {
      break;
    }

    config = {
      ...descendantSlot,
      ownerRouteId: initialConfig.ownerRouteId,
      name: initialConfig.name,
    };
  }

  return config;
}

function matchSlotRoute(
  config: NormalizedRouteSlotConfig,
  pathname: string,
  _pathOptions: RouterPathOptions,
  urlOptions: RouteUrlStateOptions,
): { readonly match: MatchedRoute; readonly branch: readonly MatchedRoute[] } | null {
  const index = getRouteMatchIndex(config.routes);

  for (const route of index.rankedRoutes) {
    if (!route.fullPath) {
      continue;
    }

    const params = parseRoutePathParams(route, pathname, urlOptions);

    if (!params) {
      continue;
    }

    const branch = createMatchedBranch(route, index, params);
    const match = branch[branch.length - 1];

    if (!match) {
      continue;
    }

    return { match, branch };
  }

  return null;
}
