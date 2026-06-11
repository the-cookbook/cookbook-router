import type { RouterPathConstraints } from '../path';
import type { NormalizedRoute, RouteMatch, RouteRedirect } from '../route-config/contracts';
import { createRouteHref } from './create-href';
import type { CreateRouterOptions } from './contracts';
import type { RouterUrlOptions } from '../url-state';

export function normalizeMaxRedirectDepth(options: CreateRouterOptions): number {
  const value = options.maxRedirectDepth ?? options.maxRedirectionDepth ?? 10;

  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Router maxRedirectDepth must be a non-negative integer.');
  }

  return value;
}

export function resolveMatchedRouteRedirect(match: RouteMatch | null): RouteRedirect | undefined {
  if (!match) {
    return undefined;
  }

  for (let index = match.branch.length - 1; index >= 0; index -= 1) {
    const redirect = match.branch[index]?.route.route.redirect;

    if (redirect !== undefined) {
      return redirect;
    }
  }

  return match.route.route.redirect;
}

interface RouteRedirectHrefOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

export function createRouteRedirectHref(
  redirect: RouteRedirect,
  routes: ReadonlyMap<string, NormalizedRoute>,
  basename: string | undefined,
  options: RouteRedirectHrefOptions,
): string {
  if (typeof redirect === 'string') {
    return redirect;
  }

  return createRouteHref({
    routeId: redirect.route,
    options: {
      ...(redirect.params === undefined ? {} : { params: redirect.params }),
      ...(redirect.search === undefined ? {} : { search: redirect.search }),
      ...(redirect.hash === undefined ? {} : { hash: redirect.hash }),
    },
    routes,
    ...(basename === undefined ? {} : { basename }),
    ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
  });
}

export function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}
