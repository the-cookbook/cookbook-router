import { extname } from 'node:path';
import { registerUrlPathConstraints, validateRoutes } from '@cookbook/router';
import type { CliFileSystem, CliRouteSource, LoadRouteFilesOptions, RouteFile } from '../contracts';
import { nodeFileSystem } from '../fs/node-file-system';
import { assertSafeRouteFilePaths } from '../security/safe-paths';
import { parseJsonRouteFile } from './parse-json-route-file';
import { parseStaticRouteModule } from './parse-static-route-module';

const defaultFs: CliFileSystem = nodeFileSystem;

/**
 * Loads route modules from disk and returns their route definitions plus any
 * `defineRoutes` options discovered on the exported route array.
 */
export async function loadRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  assertSafeRouteFilePaths(options.routeFiles);
  const fs = options.fs ?? defaultFs;
  const sources: CliRouteSource[] = [];

  for (const path of options.routeFiles) {
    const parsed = await loadRouteFile(path, fs);
    registerUrlPathConstraints(parsed.routeOptions?.pathConstraints);
    validateRoutes(parsed.routes, parsed.routeOptions?.pathOptions);
    sources.push({
      path,
      routes: parsed.routes,
      ...(parsed.routeOptions === undefined ? {} : { routeOptions: parsed.routeOptions }),
    });
  }

  return sources;
}

/** Validates all loaded route files without writing generated artifacts. */
export async function validateRouteFiles(
  options: LoadRouteFilesOptions,
): Promise<readonly CliRouteSource[]> {
  return loadRouteFiles(options);
}

async function loadRouteFile(path: string, fs: CliFileSystem): Promise<RouteFile> {
  const extension = extname(path);
  const contents = await fs.readFile(path);

  if (extension === '.json' || !extension) {
    return parseJsonRouteFile(path, contents);
  }

  if (isStaticRouteModuleExtension(extension)) {
    return parseStaticRouteModule(path, contents);
  }

  throw new Error(
    `Route file "${path}" is not directly loadable by the CLI. Use a JSON, JavaScript, TypeScript, or TSX module that exports routes.`,
  );
}

function isStaticRouteModuleExtension(extension: string): boolean {
  return (
    extension === '.js' ||
    extension === '.mjs' ||
    extension === '.cjs' ||
    extension === '.ts' ||
    extension === '.tsx' ||
    extension === '.mts' ||
    extension === '.cts'
  );
}
