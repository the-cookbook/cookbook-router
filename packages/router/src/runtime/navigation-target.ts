import { createUnknownRouteError } from '../diagnostics/router-errors';
import type { NormalizedRoute } from '../route-config/contracts';
import type { HrefOptions, NavigateOptions, NavigationOptions } from './contracts';

export function normalizeNavigateTarget<Route extends string>(
  routeOrOptions: Route | NavigateOptions<Route>,
  options?: HrefOptions<Route>,
): { readonly route: Route; readonly options?: HrefOptions<Route> } {
  if (typeof routeOrOptions === 'object' && routeOrOptions !== null) {
    const { route, ...rest } = routeOrOptions;
    return { route, options: rest as HrefOptions<Route> };
  }

  return { route: routeOrOptions as Route, ...(options === undefined ? {} : { options }) };
}

export interface ResolvedNavigationTarget {
  readonly href: string;
  readonly intercept?: NavigationOptions['intercept'];
  readonly context?: NavigationOptions['context'];
  readonly preventScrollReset?: NavigationOptions['preventScrollReset'];
  readonly url?: HrefOptions<string>['url'];
}

export interface ResolveNavigationHrefOptions {
  readonly createRouteHref: (routeId: string, options?: HrefOptions<string>) => string;
  readonly matchHref: (href: string, url?: HrefOptions<string>['url']) => unknown;
  readonly routes: ReadonlyMap<string, NormalizedRoute>;
}

/**
 * Resolves navigate.to/replace string inputs. Registered route ids are generated
 * first; otherwise app-internal hrefs are validated through route matching and
 * navigated as-is so search and hash are preserved.
 */
export function resolveNavigationTarget(
  routeOrOptions: string | NavigateOptions<string>,
  hrefOptions: HrefOptions<string> | undefined,
  options: ResolveNavigationHrefOptions,
): ResolvedNavigationTarget {
  const target = normalizeNavigateTarget(routeOrOptions, hrefOptions);

  if (options.routes.has(target.route)) {
    return {
      href: options.createRouteHref(target.route, target.options),
      ...(target.options?.intercept === undefined ? {} : { intercept: target.options.intercept }),
      ...(target.options?.context === undefined ? {} : { context: target.options.context }),
      ...(target.options?.preventScrollReset === undefined
        ? {}
        : { preventScrollReset: target.options.preventScrollReset }),
      ...(target.options?.url === undefined ? {} : { url: target.options.url }),
    };
  }

  if (!isInternalHref(target.route)) {
    throw createUnknownRouteError(target.route);
  }

  assertNoHrefRouteOptions(target.route, target.options);

  if (!options.matchHref(target.route)) {
    throw createUnknownRouteError(target.route);
  }

  return {
    href: target.route,
    ...(target.options?.intercept === undefined ? {} : { intercept: target.options.intercept }),
    ...(target.options?.context === undefined ? {} : { context: target.options.context }),
    ...(target.options?.preventScrollReset === undefined
      ? {}
      : { preventScrollReset: target.options.preventScrollReset }),
  };
}

export function isInternalHref(value: string): value is `/${string}` {
  return value.startsWith('/') && !value.startsWith('//');
}

function assertNoHrefRouteOptions(href: string, options?: HrefOptions<string>): void {
  if (!options) {
    return;
  }

  const invalidKeys = ['params', 'search', 'hash', 'url'] as const;
  const invalidKey = invalidKeys.find((key) => key in options);

  if (invalidKey) {
    throw new Error(
      `Cannot navigate to internal href "${href}" with route option "${invalidKey}". ` +
        'Pass params, search, and hash in the href string instead.',
    );
  }
}
