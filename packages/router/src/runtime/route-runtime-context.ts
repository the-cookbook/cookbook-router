import { rankRoutes } from '../matching/rank-routes';
import { registerPathConstraints } from '../path/constraints';
import { normalizePathOptions } from '../path/options';
import { getDefineRoutesOptions } from '../route-config/define-routes';
import { normalizeValidatedRoutes } from '../route-config/normalize-routes';
import { validateRoutesWithContracts } from '../route-config/validate-routes';
import { validateInterceptTargets } from '../rendering/resolve-intercepts';
import { createRouteUrlContractStore } from '../url-state/route-url-contract-store';
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
  registerPathConstraints(pathConstraints);
  const pathOptions = normalizePathOptions(options.pathOptions ?? definedRouteOptions?.pathOptions);
  const maxRedirectDepth = normalizeMaxRedirectDepth(options);

  const validated = validateRoutesWithContracts(options.routes, {
    pathOptions,
    ...(pathConstraints === undefined ? {} : { pathConstraints }),
    ...(options.url === undefined ? {} : { routerUrl: options.url }),
  });
  const normalizedRoutes = normalizeValidatedRoutes(options.routes, pathOptions);
  const routeUrlContracts = createRouteUrlContractStore({
    contracts: validated.contracts,
    ...(pathConstraints === undefined ? {} : { pathConstraints }),
    ...(options.url === undefined ? {} : { routerUrl: options.url }),
  });
  validateInterceptTargets(normalizedRoutes);

  return {
    maxRedirectDepth,
    normalizedRoutes,
    pathConstraints,
    pathOptions,
    rankedRoutes: rankRoutes(normalizedRoutes),
    routeLookup: createRouteLookup(normalizedRoutes),
    routeUrlContracts,
  };
}
