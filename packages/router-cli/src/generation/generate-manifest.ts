import { normalizeRoutes, validateRoutes } from '@cookbook/router';
import type { NormalizedRoute, RouteDefinition } from '@cookbook/router';

export interface ManifestRoute {
  readonly id: string;
  readonly path?: string;
  readonly parentId?: string;
  readonly index: boolean;
}

export interface RouteManifest {
  readonly routes: readonly ManifestRoute[];
}

export function generateManifest(routes: readonly RouteDefinition[]): RouteManifest {
  validateRoutes(routes);
  const normalized = normalizeRoutes(routes);

  return {
    routes: flattenNormalizedRoutes(normalized).map((route) => ({
      id: route.id,
      ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
      ...(route.parentId === undefined ? {} : { parentId: route.parentId }),
      index: route.index,
    })),
  };
}

export function serializeManifest(manifest: RouteManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function flattenNormalizedRoutes(routes: readonly NormalizedRoute[]): readonly NormalizedRoute[] {
  const flattened: NormalizedRoute[] = [];

  for (const route of routes) {
    flattened.push(route);
    flattened.push(...flattenNormalizedRoutes(route.children));
  }

  return flattened;
}
