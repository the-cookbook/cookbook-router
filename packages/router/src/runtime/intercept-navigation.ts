import { parseHref, type RouterLocation } from '../history/memory-history';
import { matchRoutes } from '../matching/match-routes';
import type { RouterPathOptions } from '../path';
import type {
  NormalizedRoute,
  ResolvedInterceptedRoute,
  RouteMatch,
} from '../route-config/contracts';
import {
  resolveIntercept,
  type InterceptInput,
  type ResolvedIntercept,
} from '../rendering/resolve-intercepts';
import { stripBasename } from './pathname';

export interface ResolveNavigationInterceptOptions {
  readonly source: RouteMatch | null;
  readonly destination: RouteMatch | null;
  readonly location: RouterLocation;
  readonly basename: string | undefined;
  readonly previousHref: string;
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly production: boolean;
  readonly pathOptions: RouterPathOptions;
}

export function resolveNavigationIntercept(
  options: ResolveNavigationInterceptOptions,
): ResolvedIntercept | null {
  try {
    return resolveIntercept({
      source: options.source,
      destination: options.destination,
      destinationPathname: stripBasename(options.location.pathname, options.basename),
      ...(options.intercept === undefined ? {} : { intercept: options.intercept }),
      ...(options.context === undefined ? {} : { context: options.context }),
      production: options.production,
      pathOptions: options.pathOptions,
      previousHref: options.previousHref,
    });
  } catch (error) {
    if (options.production) {
      return null;
    }

    throw error;
  }
}

export function createInterceptedRoute(
  intercept: ResolvedIntercept,
  destination: RouteMatch | null,
): ResolvedInterceptedRoute | undefined {
  if (!destination) {
    return undefined;
  }

  return {
    slot: intercept.slot,
    sourceRouteId: intercept.sourceRouteId,
    targetRouteId: intercept.targetRouteId,
    previousHref: intercept.previousLocation,
    match: destination,
    view: intercept.view,
    ...(intercept.context === undefined ? {} : { context: intercept.context }),
  };
}

export function resolveActiveInterceptSource(
  fromMatch: RouteMatch | null,
  interceptInput: InterceptInput | undefined,
  routes: readonly NormalizedRoute[],
  basename: string | undefined,
  pathOptions: RouterPathOptions,
): RouteMatch | null {
  if (!fromMatch?.intercepted) {
    return fromMatch;
  }

  if (interceptInput === undefined) {
    return null;
  }

  return matchRoutes(
    routes,
    stripBasename(parseHref(fromMatch.intercepted.previousHref).pathname, basename),
    pathOptions,
  );
}

export function restorePreviousSource(
  state: unknown,
  routes: readonly NormalizedRoute[],
  basename: string | undefined,
  pathOptions: RouterPathOptions,
): RouteMatch | null {
  if (!state || typeof state !== 'object' || !('__cookbookRouterIntercept' in state)) {
    return null;
  }

  const intercept = (
    state as { readonly __cookbookRouterIntercept?: { readonly previousHref?: string } }
  ).__cookbookRouterIntercept;

  if (!intercept?.previousHref) {
    return null;
  }

  return matchRoutes(
    routes,
    stripBasename(parseHref(intercept.previousHref).pathname, basename),
    pathOptions,
  );
}

export function isProduction(): boolean {
  const runtime = globalThis as typeof globalThis & {
    readonly process?: { readonly env?: { readonly NODE_ENV?: string } };
  };
  return runtime.process?.env?.NODE_ENV === 'production';
}
