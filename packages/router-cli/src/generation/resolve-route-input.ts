import { join } from 'node:path';
import { defineRouteTree, registerPathConstraints, validateRoutes } from '@cookbook/router';
import type { DefineRoutesOptions, RouteDeclaration, RouteDefinition } from '@cookbook/router';
import type { CliRouteOptions, CliRouteSource, RouteFile } from '../contracts';
import { loadRouterConfig } from '../config/load-router-config';
import { nodeFileSystem } from '../fs/node-file-system';
import {
  expandRouteFilePatterns,
  getRouteFilePatternWatchPaths,
} from '../glob/expand-route-file-patterns';
import { loadRouteFiles } from '../route-files/load-route-files';

export interface ResolvedRouteInput {
  readonly routeFile: RouteFile;
  readonly options: CliRouteOptions;
}

/** Resolves route definitions from direct CLI options, explicit route files, or config. */
export async function resolveRoutes(options: CliRouteOptions): Promise<readonly RouteDefinition[]> {
  const routeFile = await resolveRouteInput(options);
  return routeFile.routes;
}

/** Resolves a complete route model from direct routes or loaded route files. */
export async function resolveRouteInput(options: CliRouteOptions): Promise<RouteFile> {
  return (await resolveRouteInputWithOptions(options)).routeFile;
}

/** Resolves effective CLI options and the complete route model in one pass. */
export async function resolveRouteInputWithOptions(
  options: CliRouteOptions,
): Promise<ResolvedRouteInput> {
  const effectiveOptions = await resolveEffectiveRouteOptions(options);
  const routeFile = await resolveRouteInputFromEffectiveOptions(effectiveOptions);

  return { routeFile, options: effectiveOptions };
}

export async function resolveRouteInputFromEffectiveOptions(
  effectiveOptions: CliRouteOptions,
): Promise<RouteFile> {
  if (effectiveOptions.routes) {
    const routes = resolveAndValidateLoadedRoutes(
      effectiveOptions.routes,
      effectiveOptions.routeOptions,
    );

    return {
      routes,
      ...(effectiveOptions.routeOptions === undefined
        ? {}
        : { routeOptions: effectiveOptions.routeOptions }),
    };
  }

  if (effectiveOptions.routeFiles?.[0]) {
    const sources = await loadRouteFiles({
      routeFiles: effectiveOptions.routeFiles,
      ...(effectiveOptions.fs === undefined ? {} : { fs: effectiveOptions.fs }),
    });
    validateSelfContainedRouteTreeSources(sources);

    const routeOptions = mergeRouteOptions([
      effectiveOptions.routeOptions,
      ...sources.map((source) => source.routeOptions),
    ]);
    const routes = resolveAndValidateLoadedRoutes(
      sources.flatMap((source) => source.routes),
      routeOptions,
    );

    return {
      routes,
      routeSources: sources,
      ...(routeOptions === undefined ? {} : { routeOptions }),
    };
  }

  throw new Error('No routes or routeFiles were provided.');
}

/** Resolves config defaults and glob route-file patterns before command execution. */
export async function resolveEffectiveRouteOptions(
  options: CliRouteOptions,
): Promise<CliRouteOptions> {
  if (options.routes) {
    return {
      ...options,
      outDir: resolveOutDir({
        explicitOutDir: options.outDir,
        configOutDir: undefined,
        configRootDir: undefined,
        cwd: options.cwd,
      }),
    };
  }

  const fs = options.fs ?? nodeFileSystem;
  const shouldLoadConfig = options.configFile !== undefined || !options.routeFiles?.[0];
  const loadedConfig = shouldLoadConfig
    ? await loadRouterConfig({
        ...(options.configFile === undefined ? {} : { configFile: options.configFile }),
        ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
        fs,
        optional: options.configFile === undefined,
      })
    : undefined;

  const config = loadedConfig?.config;
  const outDir = resolveOutDir({
    explicitOutDir: options.outDir,
    configOutDir: config?.outDir,
    configRootDir: loadedConfig?.rootDir,
    cwd: options.cwd,
  });
  const routeFilePatterns = options.routeFiles?.[0]
    ? options.routeFiles
    : normalizeConfigRouteFiles(config?.routeFiles);
  const routeFileCwd = options.routeFiles?.[0] ? options.cwd : loadedConfig?.rootDir;
  const routeFileWatchPaths = routeFilePatterns
    ? getRouteFilePatternWatchPaths({
        patterns: routeFilePatterns,
        ...(routeFileCwd === undefined ? {} : { cwd: routeFileCwd }),
      })
    : undefined;
  const routeFiles = routeFilePatterns
    ? await expandRouteFilePatterns({
        patterns: routeFilePatterns,
        ...(routeFileCwd === undefined ? {} : { cwd: routeFileCwd }),
        fs,
        excludeDirs: [outDir],
      })
    : undefined;

  if (routeFilePatterns !== undefined && !routeFiles?.[0] && !options.allowEmptyRouteFiles) {
    throw new Error(
      `No route files matched routeFiles pattern ${JSON.stringify(routeFilePatterns)}.`,
    );
  }

  const routeOptions = mergeRouteOptions([config, options.routeOptions]);

  return {
    ...(routeFiles?.[0] ? { routeFiles } : {}),
    ...(routeFileWatchPaths?.[0] ? { routeFileWatchPaths } : {}),
    outDir,
    ...(routeOptions === undefined ? {} : { routeOptions }),
    ...(loadedConfig?.configFile === undefined ? {} : { configFile: loadedConfig.configFile }),
    ...(loadedConfig?.runtimeRouteOptions === undefined
      ? {}
      : { runtimeRouteOptions: loadedConfig.runtimeRouteOptions }),
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.fs === undefined ? {} : { fs: options.fs }),
    ...(options.allowEmptyRouteFiles === undefined
      ? {}
      : { allowEmptyRouteFiles: options.allowEmptyRouteFiles }),
    ...(options.runtimeRouteOptions === undefined
      ? {}
      : { runtimeRouteOptions: options.runtimeRouteOptions }),
  };
}

function resolveOutDir(options: {
  readonly explicitOutDir: string | undefined;
  readonly configOutDir: string | undefined;
  readonly configRootDir: string | undefined;
  readonly cwd: string | undefined;
}): string {
  if (options.explicitOutDir !== undefined) {
    return scopeConfigPath(options.explicitOutDir, options.cwd) ?? options.explicitOutDir;
  }

  if (options.configOutDir !== undefined) {
    return scopeConfigPath(options.configOutDir, options.configRootDir) ?? options.configOutDir;
  }

  return (
    scopeConfigPath('.cookbook-router', options.configRootDir ?? options.cwd) ?? '.cookbook-router'
  );
}

function normalizeConfigRouteFiles(
  routeFiles: string | readonly string[] | undefined,
): readonly string[] | undefined {
  if (routeFiles === undefined) {
    return undefined;
  }

  return typeof routeFiles === 'string' ? [routeFiles] : routeFiles;
}

function validateSelfContainedRouteTreeSources(sources: readonly CliRouteSource[]): void {
  for (const source of sources) {
    const exportsRouteTree = source.routeExports?.some(
      (routeExport) => routeExport.kind === 'routeTree',
    );

    if (exportsRouteTree !== true || !hasCompositionFields(source.routes)) {
      continue;
    }

    defineRouteTree({
      routes: source.routes as readonly RouteDeclaration[],
      ...(source.routeOptions?.pathOptions === undefined
        ? {}
        : { pathOptions: source.routeOptions.pathOptions }),
      ...(source.routeOptions?.pathConstraints === undefined
        ? {}
        : { pathConstraints: source.routeOptions.pathConstraints }),
    });
  }
}

function resolveAndValidateLoadedRoutes(
  routes: readonly RouteDefinition[],
  routeOptions: DefineRoutesOptions | undefined,
): readonly RouteDefinition[] {
  registerPathConstraints(routeOptions?.pathConstraints);

  if (!hasCompositionFields(routes)) {
    validateRoutes(routes, routeOptions?.pathOptions);
    return routes;
  }

  return defineRouteTree({
    routes: routes as readonly RouteDeclaration[],
    ...(routeOptions?.pathOptions === undefined ? {} : { pathOptions: routeOptions.pathOptions }),
    ...(routeOptions?.pathConstraints === undefined
      ? {}
      : { pathConstraints: routeOptions.pathConstraints }),
  });
}

function hasCompositionFields(routes: readonly RouteDefinition[]): boolean {
  for (const route of routes) {
    if (hasCompositionField(route)) {
      return true;
    }
  }

  return false;
}

function hasCompositionField(route: RouteDefinition): boolean {
  const declaration = route as RouteDefinition & {
    readonly parent?: string;
    readonly order?: number;
  };

  if (declaration.parent !== undefined || declaration.order !== undefined) {
    return true;
  }

  for (const child of declaration.children ?? []) {
    if (hasCompositionField(child)) {
      return true;
    }
  }

  return false;
}

function mergeRouteOptions(
  routeOptions: readonly (DefineRoutesOptions | undefined)[],
): DefineRoutesOptions | undefined {
  let pathOptions: DefineRoutesOptions['pathOptions'];
  let pathOptionsSignature: string | undefined;
  const pathConstraints: Record<
    string,
    NonNullable<DefineRoutesOptions['pathConstraints']>[string]
  > = {};

  for (const options of routeOptions) {
    if (options === undefined) {
      continue;
    }

    if (options.pathOptions !== undefined) {
      const nextSignature = JSON.stringify(options.pathOptions);

      if (pathOptionsSignature !== undefined && pathOptionsSignature !== nextSignature) {
        throw new Error(
          [
            'Conflicting pathOptions were provided by router config or route source files.',
            'Move pathOptions to cookbook-router.config.ts or use the same pathOptions everywhere.',
          ].join(' '),
        );
      }

      pathOptions = options.pathOptions;
      pathOptionsSignature = nextSignature;
    }

    for (const [name, constraint] of Object.entries(options.pathConstraints ?? {})) {
      const existing = pathConstraints[name];

      if (existing !== undefined && !Object.is(existing, constraint)) {
        throw new Error(
          [
            `Duplicate path constraint name "${name}" was provided by router config or route source files.`,
            'Define each custom path constraint name once, preferably in a runtime-safe module imported by cookbook-router.config.ts.',
          ].join(' '),
        );
      }

      pathConstraints[name] = constraint;
    }
  }

  const hasPathConstraints = Boolean(Object.keys(pathConstraints)[0]);

  if (pathOptions === undefined && !hasPathConstraints) {
    return undefined;
  }

  return {
    ...(pathOptions === undefined ? {} : { pathOptions }),
    ...(hasPathConstraints ? { pathConstraints } : {}),
  };
}

function scopeConfigPath(
  path: string | undefined,
  rootDir: string | undefined,
): string | undefined {
  if (path === undefined || rootDir === undefined || rootDir === '.' || isAbsoluteLike(path)) {
    return path;
  }

  return join(rootDir, path);
}

function isAbsoluteLike(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}
