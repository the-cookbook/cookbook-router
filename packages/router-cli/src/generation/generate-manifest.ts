import { registerPathConstraints, validateResolvedRouteTree } from '@cookbook/router';
import type {
  DefineRoutesOptions,
  RouteDefinition,
  RouterPathOptions,
  RouterUrlOptions,
} from '@cookbook/router';
import { flattenNormalizedRoutes } from './flatten-normalized-routes';

/** Serialized route entry written to `manifest.json`. */
export interface ManifestRoute {
  readonly id: string;
  readonly path?: string;
  readonly parentId?: string;
  readonly index: boolean;
  /** Route-level URLKit options required by manifest-based runtimes. */
  readonly url?: RouterUrlOptions;
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
  const normalized = validateResolvedRouteTree(routes, pathOptions);

  return {
    routes: flattenNormalizedRoutes(normalized).map((route) => ({
      id: route.id,
      ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
      ...(route.parentId === undefined ? {} : { parentId: route.parentId }),
      index: route.index,
      ...(route.route.url === undefined ? {} : { url: route.route.url }),
    })),
  };
}

/** Serializes a route manifest with stable formatting. */
export function serializeManifest(manifest: RouteManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function resolveGenerationPathOptions(
  options: DefineRoutesOptions | RouterPathOptions,
): RouterPathOptions {
  if (isDefineRoutesOptions(options)) {
    registerPathConstraints(options.pathConstraints);
    return options.pathOptions ?? {};
  }

  registerPathConstraints();
  return options;
}

function isDefineRoutesOptions(
  options: DefineRoutesOptions | RouterPathOptions,
): options is DefineRoutesOptions {
  return 'pathOptions' in options || 'pathConstraints' in options;
}
