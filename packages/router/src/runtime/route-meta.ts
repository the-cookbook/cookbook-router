import { createRouteLookup } from './create-route-lookup';
import type { MatchedRoute, NormalizedRoute, RouteMatch } from '../route-config/contracts';
import type { RouteId, RouteMeta as RegisteredRouteMeta, RouteParams } from '../contracts';

/** Ordered metadata entry for one route in an active or target branch. */
export interface RouteMetaEntry<Route extends string = RouteId> {
  readonly id: Route;
  readonly params: Route extends RouteId ? RouteParams<Route> : Record<string, unknown>;
  readonly meta: Route extends RouteId ? RegisteredRouteMeta<Route> : Record<string, unknown>;
  readonly route: NormalizedRoute;
  readonly match?: MatchedRoute;
}

export type RouteMetaMergeMode = 'leaf' | 'shallow' | 'deep' | 'append' | 'prepend';

export interface RouteMetaMergeOptions {
  readonly default?: RouteMetaMergeMode;
  readonly keys?: Readonly<Record<string, RouteMetaMergeMode>>;
}

export type RouteMetaMergeInput = RouteMetaMergeMode | RouteMetaMergeOptions;

export interface RouteMetaChainOptions {
  readonly includeAncestors?: boolean;
}

/** Returns route-local metadata for a route id. */
export function getRouteMeta<Route extends string>(
  routes: readonly NormalizedRoute[],
  routeId: Route,
): RegisteredRouteMeta<Route> {
  const route = createRouteLookup(routes).get(routeId);
  return (route?.meta ?? {}) as RegisteredRouteMeta<Route>;
}

/** Returns metadata entries for a route id, optionally including ancestors. */
export function getRouteMetaChain<Route extends string>(
  routes: readonly NormalizedRoute[],
  routeId: Route,
  options: RouteMetaChainOptions = {},
): readonly RouteMetaEntry<Route>[] {
  const lookup = createRouteLookup(routes);
  const route = lookup.get(routeId);

  if (!route) {
    return [];
  }

  const chain: RouteMetaEntry<Route>[] = [];
  let current: NormalizedRoute | undefined = route;

  while (current) {
    chain.unshift(createRouteMetaEntry<Route>(current, undefined));

    if (options.includeAncestors !== true) {
      break;
    }

    current = current.parentId ? lookup.get(current.parentId) : undefined;
  }

  return chain;
}

/** Returns metadata entries for an active match, optionally including ancestors. */
export function getActiveRouteMetaChain<Route extends string = RouteId>(
  match: RouteMatch<Route> | null,
  options: RouteMetaChainOptions = {},
): readonly RouteMetaEntry[] {
  if (!match) {
    return [];
  }

  const branch = options.includeAncestors === true ? match.branch : match.branch.slice(-1);
  return branch.map((entry) => createRouteMetaEntry(entry.route, entry));
}

/** Merges an ordered metadata chain into one object. */
export function mergeRouteMetaChain(
  chain: readonly { readonly meta: Record<string, unknown> }[],
  merge?: RouteMetaMergeInput,
): Record<string, unknown> {
  const options = normalizeRouteMetaMergeOptions(merge);
  const merged: Record<string, unknown> = {};

  for (const entry of chain) {
    for (const [key, value] of Object.entries(entry.meta)) {
      if (value === undefined) {
        continue;
      }

      const mode = options.keys?.[key] ?? options.default ?? 'shallow';
      merged[key] = mergeRouteMetaValue(merged[key], value, mode);
    }
  }

  return merged;
}

function normalizeRouteMetaMergeOptions(merge?: RouteMetaMergeInput): RouteMetaMergeOptions {
  if (typeof merge === 'string') {
    return { default: merge };
  }

  return {
    default: 'shallow',
    ...merge,
  };
}

function createRouteMetaEntry<Route extends string>(
  route: NormalizedRoute,
  match: MatchedRoute | undefined,
): RouteMetaEntry<Route> {
  return {
    id: route.id as Route,
    params: (match?.params ?? {}) as Route extends RouteId
      ? RouteParams<Route>
      : Record<string, unknown>,
    meta: (route.meta ?? {}) as Route extends RouteId
      ? RegisteredRouteMeta<Route>
      : Record<string, unknown>,
    route,
    ...(match === undefined ? {} : { match }),
  };
}

function mergeRouteMetaValue(previous: unknown, next: unknown, mode: RouteMetaMergeMode): unknown {
  if (mode === 'append') {
    return [...toMetaArray(previous), ...toMetaArray(next)];
  }

  if (mode === 'prepend') {
    return [...toMetaArray(next), ...toMetaArray(previous)];
  }

  if (mode === 'leaf') {
    return next;
  }

  if (mode === 'deep') {
    return deepMergeRouteMeta(previous, next);
  }

  return shallowMergeRouteMeta(previous, next);
}

function toMetaArray(value: unknown): readonly unknown[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function shallowMergeRouteMeta(previous: unknown, next: unknown): unknown {
  if (isPlainObject(previous) && isPlainObject(next)) {
    return { ...previous, ...next };
  }

  return next;
}

function deepMergeRouteMeta(previous: unknown, next: unknown): unknown {
  if (!isPlainObject(previous) || !isPlainObject(next)) {
    return next;
  }

  const merged: Record<string, unknown> = { ...previous };

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      continue;
    }

    merged[key] = isPlainObject(value) ? deepMergeRouteMeta(merged[key], value) : value;
  }

  return merged;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
