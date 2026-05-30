import { normalizeRoutes, registerPathConstraints, validateRoutes } from '@cookbook/router';
import type {
  DefineRoutesOptions,
  NormalizedRoute,
  RouteDefinition,
  RouterPathOptions,
} from '@cookbook/router';

/** Serialized route entry written to `manifest.json`. */
export interface ManifestRoute {
  readonly id: string;
  readonly path?: string;
  readonly parentId?: string;
  readonly index: boolean;
}

/** Complete route manifest generated for tooling and diagnostics. */
export interface RouteManifest {
  readonly routes: readonly ManifestRoute[];
}

/** Generates a JSON-serializable manifest from a route tree. */
export function generateManifest(
  routes: readonly RouteDefinition[],
  options: DefineRoutesOptions | RouterPathOptions = {},
): RouteManifest {
  const pathOptions = resolveGenerationPathOptions(options);
  validateRoutes(routes, pathOptions);
  const normalized = normalizeRoutes(routes, pathOptions);

  return {
    routes: flattenNormalizedRoutes(normalized).map((route) => ({
      id: route.id,
      ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
      ...(route.parentId === undefined ? {} : { parentId: route.parentId }),
      index: route.index,
    })),
  };
}

/** Serializes a route manifest with stable formatting. */
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

function resolveGenerationPathOptions(
  options: DefineRoutesOptions | RouterPathOptions,
): RouterPathOptions {
  if (isDefineRoutesOptions(options)) {
    registerPathConstraints(options.pathConstraints);
    return options.pathOptions ?? {};
  }

  return options;
}

function isDefineRoutesOptions(
  options: DefineRoutesOptions | RouterPathOptions,
): options is DefineRoutesOptions {
  return 'pathOptions' in options || 'pathConstraints' in options;
}
