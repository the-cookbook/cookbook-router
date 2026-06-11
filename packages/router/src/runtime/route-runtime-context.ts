import { rankRoutes } from '../matching/rank-routes';
import { normalizePathOptions } from '../path';
import { getDefineRoutesOptions } from '../route-config/define-routes';
import { normalizeRoutes } from '../route-config/normalize-routes';
import { validateRoutes } from '../route-config/validate-routes';
import { validateInterceptTargets } from '../rendering/resolve-intercepts';
import { registerUrlPathConstraints } from '../url-state';
import { createRouteLookup } from './create-route-lookup';
import type { CreateRouterOptions } from './contracts';
import { mergePathConstraints } from './path-constraints';
import { normalizeMaxRedirectDepth } from './redirects';

export function createRouteRuntimeContext(options: CreateRouterOptions) {
  const definedRouteOptions = getDefineRoutesOptions(options.routes);
  const pathConstraints = mergePathConstraints(
    definedRouteOptions?.pathConstraints,
    options.pathConstraints,
  );
  registerUrlPathConstraints(pathConstraints);
  const pathOptions = normalizePathOptions(options.pathOptions ?? definedRouteOptions?.pathOptions);
  const maxRedirectDepth = normalizeMaxRedirectDepth(options);

  validateRoutes(options.routes, pathOptions);
  const normalizedRoutes = normalizeRoutes(options.routes, pathOptions);
  validateInterceptTargets(normalizedRoutes);

  return {
    maxRedirectDepth,
    normalizedRoutes,
    pathConstraints,
    pathOptions,
    rankedRoutes: rankRoutes(normalizedRoutes),
    routeLookup: createRouteLookup(normalizedRoutes),
  };
}
