import {
  buildHash as buildUrlKitHash,
  buildSearch as buildUrlKitSearch,
  normalizeHash,
  parseHash as parseUrlKitHash,
  parseSearch as parseUrlKitSearch,
} from '@cookbook/urlkit/router-runtime';
import type { RouterPathConstraints } from '../path/constraints';
import type { RouterPathMatchOptions } from '../path/options';
import type { NormalizedRoute } from '../route-config/contracts';
import type {
  RouterRouteUrlContract,
  RouterUnknownSearchParams,
  RouterUrlOptions,
} from './contracts';
import { createRouteUrlContract } from './create-route-url-contract';
import type { RouteUrlContractStore } from './route-url-contract-store';
import {
  toUrlKitHashParseOptions,
  toUrlKitBuildOptions,
  toUrlKitPathMatchOptions,
  toUrlKitSearchParseOptions,
} from './map-router-url-options';
import { resolveUrlOptions } from './resolve-url-options';

export interface RouteUrlStateOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly contractStore?: RouteUrlContractStore;
}

export interface ParsedRouteSearchState {
  readonly search: Record<string, unknown>;
  readonly unknownSearch?: RouterUnknownSearchParams;
}

export interface ParsedRouteUrlState extends ParsedRouteSearchState {
  readonly params: Record<string, unknown>;
  readonly hash: unknown;
}

/** Parses and validates one route's URL state using URLKit. */
export function parseRouteUrlState(
  route: NormalizedRoute,
  pathname: string,
  search: string,
  hash: string,
  options: RouteUrlStateOptions = {},
): ParsedRouteUrlState {
  const searchState = parseRouteSearchState(route, pathname, search, options);

  return {
    params: parseRoutePathParamsOrThrow(route, pathname, options),
    search: searchState.search,
    ...(searchState.unknownSearch === undefined
      ? {}
      : { unknownSearch: searchState.unknownSearch }),
    hash: parseRouteHash(route, hash, options),
  };
}

/** Attempts to parse one route's path params with URLKit parsed-param semantics. */
export function parseRoutePathParams(
  route: NormalizedRoute,
  pathname: string,
  options: RouteUrlStateOptions = {},
): Record<string, unknown> | null {
  try {
    return parseRoutePathParamsOrThrow(route, pathname, options);
  } catch {
    return null;
  }
}

/** Builds a pathname for one route from parsed URLKit params. */
export function buildRoutePath(
  route: NormalizedRoute,
  params: unknown,
  options: RouteUrlStateOptions = {},
): string {
  const contract = resolveRouteUrlContract(route, options);
  const pathname = contract.buildPath(params ?? {}) as string;

  // URLKit canonicalizes a trailing slash during path building today. Keep the
  // router's normalized full path authoritative until URLKit exposes the same
  // path pruning option directly.
  if (
    route.fullPath &&
    route.fullPath !== '/' &&
    route.fullPath.endsWith('/') &&
    !pathname.endsWith('/')
  ) {
    return `${pathname}/`;
  }

  return pathname;
}

/** Parses route search with URLKit, using the route schema when one exists. */
export function parseRouteSearch(
  route: NormalizedRoute,
  search: string,
  options: RouteUrlStateOptions = {},
): Record<string, unknown> {
  const urlOptions = resolveRouteUrlOptions(route, options);

  if (route.route.search) {
    return parseSchemaRouteSearch(route, search, options, urlOptions);
  }

  return parseUrlKitSearch(search, toUrlKitSearchParseOptions(urlOptions)) as Record<
    string,
    unknown
  >;
}

/**
 * Parses route search and preserves URLKit's sibling `unknownSearch` state when
 * the effective policy is `unknownSearch: 'preserve'`.
 */
export function parseRouteSearchState(
  route: NormalizedRoute,
  pathname: string,
  search: string,
  options: RouteUrlStateOptions = {},
): ParsedRouteSearchState {
  const urlOptions = resolveRouteUrlOptions(route, options);

  if (route.route.search) {
    return parseSchemaRouteSearchState(route, pathname, search, options, urlOptions);
  }

  return {
    search: parseUrlKitSearch(search, toUrlKitSearchParseOptions(urlOptions)) as Record<
      string,
      unknown
    >,
  };
}

/** Builds route search with URLKit, using the route schema when one exists. */
export function buildRouteSearch(
  route: NormalizedRoute,
  search: unknown,
  options: RouteUrlStateOptions = {},
): string {
  const urlOptions = {
    ...toUrlKitBuildOptions(resolveRouteUrlOptions(route, options)),
    sortKeys: true,
  };

  if (route.route.search) {
    return resolveRouteUrlContract(route, options).buildSearch((search ?? {}) as never, urlOptions);
  }

  return buildUrlKitSearch((search ?? {}) as Record<string, unknown>, urlOptions);
}

/** Parses a route hash with URLKit, preserving unrestricted hashes when no schema exists. */
export function parseRouteHash(
  route: NormalizedRoute,
  hash: string,
  options: RouteUrlStateOptions = {},
): unknown {
  const urlOptions = resolveRouteUrlOptions(route, options);

  if (route.route.hash) {
    return parseUrlKitHash(hash, route.route.hash, toUrlKitHashParseOptions(urlOptions));
  }

  return normalizeHash(hash);
}

/** Builds a route hash with URLKit, accepting either bare or #-prefixed input. */
export function buildRouteHash(
  route: NormalizedRoute,
  hash: unknown,
  options: RouteUrlStateOptions = {},
): string {
  const normalized = normalizeHash(hash);

  if (route.route.hash) {
    return resolveRouteUrlContract(route, options).buildHash(
      normalized as never,
      toUrlKitBuildOptions(resolveRouteUrlOptions(route, options)),
    );
  }

  return buildUrlKitHash(normalized);
}

/** Resolves effective URL options for a normalized route operation. */
export function resolveRouteUrlOptions(
  route: NormalizedRoute,
  options: RouteUrlStateOptions,
): RouterUrlOptions {
  return resolveUrlOptions({
    ...(options.routerUrl === undefined ? {} : { router: options.routerUrl }),
    ...(route.route.url === undefined ? {} : { route: route.route.url }),
    ...(options.callUrl === undefined ? {} : { call: options.callUrl }),
  });
}

function parseSchemaRouteSearch(
  route: NormalizedRoute,
  search: string,
  options: RouteUrlStateOptions,
  urlOptions: RouterUrlOptions,
): Record<string, unknown> {
  return resolveRouteUrlContract(route, options).parseSearch(
    search,
    toUrlKitSearchParseOptions(urlOptions),
  ) as Record<string, unknown>;
}

function parseSchemaRouteSearchState(
  route: NormalizedRoute,
  pathname: string,
  search: string,
  options: RouteUrlStateOptions,
  urlOptions: RouterUrlOptions,
): ParsedRouteSearchState {
  return toParsedRouteSearchState(
    resolveRouteUrlContract(route, options).parse(
      createUrlInput(pathname, search),
      toUrlKitSearchParseOptions(urlOptions),
    ),
  );
}

function createUrlInput(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

function toParsedRouteSearchState(parsed: unknown): ParsedRouteSearchState {
  const state = parsed as {
    readonly search?: Record<string, unknown>;
    readonly unknownSearch?: RouterUnknownSearchParams;
  };

  return {
    search: state.search ?? {},
    ...(state.unknownSearch === undefined ? {} : { unknownSearch: state.unknownSearch }),
  };
}

function parseRoutePathParamsOrThrow(
  route: NormalizedRoute,
  pathname: string,
  options: RouteUrlStateOptions,
): Record<string, unknown> {
  const urlOptions = resolveRouteUrlOptions(route, options);
  const contract = resolveRouteUrlContract(route, options);
  const params = contract.parsePathname(
    pathname,
    toRoutePathMatchOptions(route, urlOptions),
  ) as Record<string, unknown>;

  return normalizeRoutePathParams(route, params);
}

function toRoutePathMatchOptions(
  route: NormalizedRoute,
  urlOptions: RouterUrlOptions,
): RouterPathMatchOptions {
  const pathMatch = toUrlKitPathMatchOptions(urlOptions);

  if (!route.params.some((param) => param.wildcard)) {
    return pathMatch;
  }

  return {
    ...pathMatch,
    wildcardFormat: 'array',
  };
}

function normalizeRoutePathParams(
  route: NormalizedRoute,
  params: Record<string, unknown>,
): Record<string, unknown> {
  let normalized = params;

  for (const param of route.params) {
    if (!param.wildcard) {
      continue;
    }

    const value = normalized[param.name];

    if (value === undefined) {
      continue;
    }

    if (normalized === params) {
      normalized = { ...params };
    }

    normalized[param.name] = toWildcardSegments(value);
  }

  return normalized;
}

function toWildcardSegments(value: unknown): readonly string[] {
  const segments = Array.isArray(value) ? value.map(String) : String(value).split('/');

  if (segments.length === 1 && segments[0] === '') {
    return [];
  }

  if (segments[segments.length - 1] === '') {
    return segments.slice(0, -1);
  }

  return segments;
}

function resolveRouteUrlContract(
  route: NormalizedRoute,
  options: RouteUrlStateOptions,
): RouterRouteUrlContract {
  if (options.contractStore) {
    return options.contractStore.get(route);
  }

  return createNormalizedRouteUrlContract(route, options);
}

function createNormalizedRouteUrlContract(
  route: NormalizedRoute,
  options: RouteUrlStateOptions,
): RouterRouteUrlContract {
  return createRouteUrlContract(
    {
      ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
      ...(route.route.search === undefined ? {} : { search: route.route.search }),
      ...(route.route.hash === undefined ? {} : { hash: route.route.hash }),
      ...(route.route.url === undefined ? {} : { url: route.route.url }),
    },
    {
      routeId: route.id,
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(options.callUrl === undefined ? {} : { callUrl: options.callUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    },
  );
}
