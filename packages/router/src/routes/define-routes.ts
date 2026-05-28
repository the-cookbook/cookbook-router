import {
  registerPathConstraints,
  type RouterPathConstraints,
  type RouterPathOptions,
} from '../pathkit/pathkit';
import { validateRoutes } from '../validation/validate-routes';
import type { RouteDefinition } from './contracts';

export interface DefineRoutesOptions {
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

const definedRouteOptions = new WeakMap<readonly RouteDefinition[], DefineRoutesOptions>();

export function defineRoutes<const Routes extends readonly RouteDefinition[]>(
  routes: Routes & readonly RouteDefinition[],
  options?: DefineRoutesOptions,
): Routes {
  registerPathConstraints(options?.pathConstraints);
  validateRoutes(routes, options?.pathOptions);

  definedRouteOptions.set(routes, options ?? {});

  return routes;
}

export function getDefineRoutesOptions(
  routes: readonly RouteDefinition[],
): DefineRoutesOptions | undefined {
  return definedRouteOptions.get(routes);
}
