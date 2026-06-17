import type { RouteDeclaration } from './contracts';

/**
 * Defines one route declaration while preserving literal route IDs, URL state,
 * path patterns, metadata, and child declarations.
 */
export function defineRoute<const Route extends RouteDeclaration>(route: Route): Route {
  return route;
}
