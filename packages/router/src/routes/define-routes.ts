import type { RouterPathConstraints, RouterPathOptions } from '../pathkit/pathkit';
import { registerUrlPathConstraints } from '../url/register-url-path-constraints';
import { validateRoutes } from '../validation/validate-routes';
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
  registerUrlPathConstraints(options?.pathConstraints);
  validateRoutes(routes, options?.pathOptions);

  definedRouteOptions.set(routes, options ?? {});

  return routes;
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
  return definedRouteOptions.get(routes);
}
