import {
  buildHash as buildUrlKitHash,
  buildSearch as buildUrlKitSearch,
  normalizeHash,
  parseSearch as parseUrlKitSearch,
} from '@cookbook/urlkit/router-runtime';
import { matchPathPattern, type RouterPathConstraints } from '../pathkit/pathkit';
import type { NormalizedRoute, RouteHashSchema, RouteSearchSchema } from '../routes/contracts';
import type { RouterUrlOptions } from './contracts';
import { createRouteUrlContract } from './create-route-url-contract';
import { resolveUrlOptions } from './resolve-url-options';

export interface RouteUrlStateOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

export interface ParsedRouteUrlState {
  readonly params: Record<string, unknown>;
  readonly search: Record<string, unknown>;
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
  return {
    params: parseRoutePathParamsOrThrow(route, pathname, options),
    search: parseRouteSearch(route, search, options),
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
  const contract = createNormalizedRouteUrlContract(route, options);
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

  return parseUrlKitSearch(search, toUrlKitSearchOptions(urlOptions)) as Record<string, unknown>;
}

/** Builds route search with URLKit, using the route schema when one exists. */
export function buildRouteSearch(
  route: NormalizedRoute,
  search: unknown,
  options: RouteUrlStateOptions = {},
): string {
  const urlOptions = {
    ...toUrlKitSearchOptions(resolveRouteUrlOptions(route, options)),
    sortKeys: true,
  };

  if (route.route.search) {
    return createNormalizedRouteUrlContract(route, options).buildSearch(
      (search ?? {}) as never,
      urlOptions,
    );
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
    if ((urlOptions.invalidHash ?? 'recover') !== 'recover') {
      return createNormalizedRouteUrlContract(route, options).parseHash(hash);
    }

    try {
      return createNormalizedRouteUrlContract(route, options).parseHash(hash);
    } catch {
      return getHashDefault(route.route.hash);
    }
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
    return createNormalizedRouteUrlContract(route, options).buildHash(normalized as never);
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
  const invalidSearch = urlOptions.invalidSearch ?? 'recover';
  const urlKitOptions = toUrlKitSearchOptions(urlOptions);

  if (invalidSearch !== 'recover') {
    return createNormalizedRouteUrlContract(route, options).parseSearch(
      search,
      urlKitOptions,
    ) as Record<string, unknown>;
  }

  return parseRecoverableRouteSearch(route, search, options, urlKitOptions);
}

function parseRecoverableRouteSearch(
  route: NormalizedRoute,
  search: string,
  options: RouteUrlStateOptions,
  urlKitOptions: Pick<RouterUrlOptions, 'arrayFormat'>,
): Record<string, unknown> {
  const schema = route.route.search;
  const invalidKeys = new Set<string>();
  let currentSearch = search;
  const maxAttempts = Object.keys(schema ?? {}).length + 1;
  const contract = createRecoverableSearchContract(route, options);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return contract.parseSearch(currentSearch, urlKitOptions) as Record<string, unknown>;
    } catch (error) {
      const invalidKey = getRecoverableInvalidSearchKey(error, schema);

      if (!invalidKey || invalidKeys.has(invalidKey)) {
        throw error;
      }

      invalidKeys.add(invalidKey);
      currentSearch = removeSearchKey(currentSearch, invalidKey);
    }
  }

  return contract.parseSearch(currentSearch, urlKitOptions) as Record<string, unknown>;
}

function createRecoverableSearchContract(route: NormalizedRoute, options: RouteUrlStateOptions) {
  const recoverableSearch = makeSearchSchemaRecoverable(route.route.search);

  return createRouteUrlContract(
    {
      ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
      ...(recoverableSearch === undefined ? {} : { search: recoverableSearch }),
      ...(route.route.hash === undefined ? {} : { hash: route.route.hash }),
      ...(route.route.url === undefined ? {} : { url: route.route.url }),
    },
    {
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(options.callUrl === undefined ? {} : { callUrl: options.callUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    },
  );
}

function makeSearchSchemaRecoverable(
  schema: RouteSearchSchema | undefined,
): RouteSearchSchema | undefined {
  if (!schema) {
    return schema;
  }

  return Object.fromEntries(
    Object.entries(schema).map(([key, field]) => [key, makeSearchFieldRecoverable(field)]),
  ) as RouteSearchSchema;
}

function makeSearchFieldRecoverable(field: RouteSearchSchema[string]): RouteSearchSchema[string] {
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    return field;
  }

  return { ...field, optional: true } as RouteSearchSchema[string];
}

function getRecoverableInvalidSearchKey(
  error: unknown,
  schema: RouteSearchSchema | undefined,
): string | undefined {
  if (!schema || !isUrlKitInvalidSearchError(error)) {
    return undefined;
  }

  const [pathHead] = error.path;

  if (typeof pathHead !== 'string' || !(pathHead in schema)) {
    return undefined;
  }

  return pathHead;
}

function isUrlKitInvalidSearchError(
  error: unknown,
): error is { readonly code: 'invalid-search'; readonly path: readonly unknown[] } {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'invalid-search' &&
    'path' in error &&
    Array.isArray(error.path)
  );
}

function removeSearchKey(search: string, key: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.delete(key);
  const next = params.toString();

  return next ? `?${next}` : '';
}

function getHashDefault(hash: RouteHashSchema): unknown {
  if (!hash || typeof hash !== 'object' || Array.isArray(hash) || !('default' in hash)) {
    return undefined;
  }

  return hash.default;
}

function toUrlKitSearchOptions(options: RouterUrlOptions): Pick<RouterUrlOptions, 'arrayFormat'> {
  return {
    ...(options.arrayFormat === undefined ? {} : { arrayFormat: options.arrayFormat }),
  };
}

function parseRoutePathParamsOrThrow(
  route: NormalizedRoute,
  pathname: string,
  options: RouteUrlStateOptions,
): Record<string, unknown> {
  const contract = createNormalizedRouteUrlContract(route, options);
  const params = contract.parsePathname(pathname) as Record<string, unknown>;

  return mergeWildcardParamsFromPathkit(route, pathname, params);
}

function mergeWildcardParamsFromPathkit(
  route: NormalizedRoute,
  pathname: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const missingWildcardParams = route.params.filter(
    (param) => param.constraint === 'wildcard' && params[param.name] === undefined,
  );

  if (!missingWildcardParams.length || !route.fullPath) {
    return params;
  }

  // URLKit v1.0 validates PathKit catch-all routes but does not currently
  // return wildcard captures. Keep this bridge internal until URLKit exposes
  // catch-all values through parsed pathname contracts.
  const pathkitParams = matchPathPattern(route.fullPath, pathname);

  if (!pathkitParams) {
    return params;
  }

  return missingWildcardParams.reduce<Record<string, unknown>>(
    (next, param) => ({ ...next, [param.name]: pathkitParams[param.name] }),
    params,
  );
}

function createNormalizedRouteUrlContract(route: NormalizedRoute, options: RouteUrlStateOptions) {
  return createRouteUrlContract(
    {
      ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
      ...(route.route.search === undefined ? {} : { search: route.route.search }),
      ...(route.route.hash === undefined ? {} : { hash: route.route.hash }),
      ...(route.route.url === undefined ? {} : { url: route.route.url }),
    },
    {
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(options.callUrl === undefined ? {} : { callUrl: options.callUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    },
  );
}
