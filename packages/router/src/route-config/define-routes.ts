import type { RouterPathConstraints } from '../path/constraints';
import type { RouterPathOptions } from '../path/options';
import { registerPathConstraints } from '../path/constraints';
import { validateRoutes } from './validate-routes';
import type { RouteDefinition } from './contracts';

/**
 * Extra options stored with a route array produced by `defineRoutes`.
 *
 * Custom path constraints are registered before route validation, and both
 * router creation and the CLI can later read these options from the route array.
 */
export interface DefineRoutesOptions {
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

const definedRouteOptions = new WeakMap<readonly RouteDefinition[], DefineRoutesOptions>();
const DEFINE_ROUTES_OPTIONS_SYMBOL = Symbol.for('cookbook.router.defineRoutesOptions');

type RouteArrayWithDefineRoutesOptions = readonly RouteDefinition[] & {
  readonly [DEFINE_ROUTES_OPTIONS_SYMBOL]?: DefineRoutesOptions;
};

/**
 * Defines, validates, and tags an authored route tree for typed router workflows.
 *
 * Prefer this helper when route files are consumed by the CLI. Validation runs
 * immediately so malformed paths, duplicate ids, and invalid constraints fail at
 * authoring time.
 */
export function defineRoutes<const Routes extends readonly RouteDefinition[]>(
  routes: Routes & readonly RouteDefinition[],
  options?: DefineRoutesOptions,
): Routes {
  registerPathConstraints(options?.pathConstraints);
  validateRoutes(routes, options?.pathOptions);
  setDefineRoutesOptions(routes, options ?? {});

  return routes;
}

/**
 * Attaches define-routes options to a route array returned by a route helper.
 *
 * This is intentionally internal to route-config helpers. Runtime creation reads
 * these options so route arrays preserve path-options and custom-constraint
 * behavior after composition.
 */
export function setDefineRoutesOptions(
  routes: readonly RouteDefinition[],
  options: DefineRoutesOptions,
): void {
  definedRouteOptions.set(routes, options);
  Object.defineProperty(routes, DEFINE_ROUTES_OPTIONS_SYMBOL, {
    value: options,
    enumerable: false,
    configurable: true,
    writable: false,
  });
}

/**
 * Reads options previously attached to a route array by `defineRoutes`.
 *
 * Router creation and CLI generation use this to preserve custom path
 * constraints and path pruning behavior without changing the route shape.
 */
export function getDefineRoutesOptions(
  routes: readonly RouteDefinition[],
): DefineRoutesOptions | undefined {
  return (
    definedRouteOptions.get(routes) ??
    (routes as RouteArrayWithDefineRoutesOptions)[DEFINE_ROUTES_OPTIONS_SYMBOL]
  );
}
