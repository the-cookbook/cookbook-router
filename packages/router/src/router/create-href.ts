import {
  createGeneratedHrefMismatchError,
  createInvalidParamError,
  createMissingParamError,
  createMissingPathError,
  createUnknownRouteError,
} from '../diagnostics/router-errors';
import type { RouterPathConstraints } from '../pathkit/pathkit';
import type { NormalizedRoute } from '../routes/contracts';
import {
  buildRouteHash,
  buildRoutePath,
  buildRouteSearch,
  parseRoutePathParams,
} from '../url/route-url-state';
import type { RouterUrlOptions } from '../url';
import { applyBasename, stripBasename } from './pathname';

export interface CreateHrefOptions {
  readonly params?: unknown;
  readonly search?: unknown;
  readonly hash?: unknown;
  readonly url?: RouterUrlOptions;
}

export interface CreateRouteHrefOptions<Route extends string = string> {
  readonly routeId: Route;
  readonly options?: CreateHrefOptions;
  readonly routes: ReadonlyMap<string, NormalizedRoute>;
  readonly basename?: string;
  readonly routerUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

/** Builds an href for a route id using URLKit for params, search, and hash. */
export function createRouteHref<Route extends string>(
  options: CreateRouteHrefOptions<Route>,
): string {
  const route = options.routes.get(options.routeId);

  if (!route) {
    throw createUnknownRouteError(options.routeId);
  }

  if (!route.fullPath) {
    throw createMissingPathError(options.routeId);
  }

  assertRequiredPathParams(route, options.options?.params);

  const routeUrlOptions = {
    ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
    ...(options.options?.url === undefined ? {} : { callUrl: options.options.url }),
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
  };
  const pathname = applyBasename(
    buildRoutePathWithDiagnostics(route, options.options?.params, routeUrlOptions),
    options.basename,
  );
  const search = buildRouteSearch(route, options.options?.search, routeUrlOptions);
  const hash = buildRouteHash(route, options.options?.hash, routeUrlOptions);
  const href = `${pathname}${search}${hash}`;

  if (!parseRoutePathParams(route, stripBasename(pathname, options.basename), routeUrlOptions)) {
    throw createGeneratedHrefMismatchError(options.routeId, href, route.fullPath);
  }

  return href;
}

function buildRoutePathWithDiagnostics(
  route: NormalizedRoute,
  params: unknown,
  options: Parameters<typeof buildRoutePath>[2],
): string {
  try {
    return buildRoutePath(route, params, options);
  } catch (error) {
    throw mapUrlKitPathError(route, params, error);
  }
}

function assertRequiredPathParams(route: NormalizedRoute, params: unknown): void {
  const values = asParamRecord(params);

  for (const param of route.params) {
    const value = values[param.name];

    if (value === undefined || value === null || value === '') {
      throw createMissingParamError(route.id, param.name, param.token, value);
    }
  }
}

function mapUrlKitPathError(route: NormalizedRoute, params: unknown, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const values = asParamRecord(params);
  const invalid = route.params.find((candidate) => message.includes(`"${candidate.name}"`));

  if (invalid) {
    return createInvalidParamError(route.id, invalid.name, invalid.token, values[invalid.name]);
  }

  return error instanceof Error ? error : new Error(message);
}

function asParamRecord(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== 'object') {
    return {};
  }

  return params as Record<string, unknown>;
}
