import { isAbsolute, resolve } from 'node:path';
import type { CliFileSystem, CliRouteOptions, CommandResult } from '../contracts';
import { getRouterConfigWatchCandidates } from '../config/router-config-filenames';
import { generateRouterArtifacts } from '../generation/generate-router-artifacts';
import { resolveEffectiveRouteOptions } from '../generation/resolve-route-input';
import { getRouteFilePatternWatchPaths } from '../glob/expand-route-file-patterns';

export interface CookbookRouterBuilderPluginOptions {
  /** Project root used for config discovery and relative route files. */
  readonly cwd?: string;
  /** Router config file. Defaults to cookbook-router.config.* discovery. */
  readonly configFile?: string;
  /** Route source files or globs. Overrides routeFiles from config when provided. */
  readonly routeFiles?: string | readonly string[];
  /** Generated output directory. Defaults to config outDir or .cookbook-router. */
  readonly outDir?: string;
  /** File-system adapter for tests and non-standard runtimes. */
  readonly fs?: CliFileSystem;
}

export interface RouterBuildRunnerOptions extends CookbookRouterBuilderPluginOptions {}

export interface RouterBuildRunnerResult extends CommandResult {
  readonly watchPaths: readonly string[];
  readonly outDir: string;
  readonly error?: Error;
}

export interface RouterBuildRunner {
  run(): Promise<RouterBuildRunnerResult>;
}

export function createRouterBuildRunner(options: RouterBuildRunnerOptions = {}): RouterBuildRunner {
  return {
    async run() {
      const cliOptions = toRouterBuildCliOptions(options);

      try {
        const commandResult = await generateRouterArtifacts(cliOptions);
        const watchState = await resolveRouterBuildWatchState(options);

        return {
          ...commandResult,
          watchPaths: watchState.watchPaths,
          outDir: watchState.outDir,
        };
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        const watchState = await resolveRouterBuildWatchState(options);

        return {
          ok: false,
          files: [],
          errors: [normalizedError.message],
          watchPaths: watchState.watchPaths,
          outDir: watchState.outDir,
          error: normalizedError,
        };
      }
    },
  };
}

export interface RouterBuildWatchState {
  readonly watchPaths: readonly string[];
  readonly outDir: string;
}

export async function resolveRouterBuildWatchState(
  options: RouterBuildRunnerOptions = {},
): Promise<RouterBuildWatchState> {
  const root = options.cwd ?? '.';

  try {
    const effectiveOptions = await resolveEffectiveRouteOptions({
      ...toRouterBuildCliOptions(options),
      allowEmptyRouteFiles: true,
    });
    const watchPaths = [
      ...(effectiveOptions.configFile === undefined ? [] : [effectiveOptions.configFile]),
      ...(effectiveOptions.routeFileWatchPaths ?? effectiveOptions.routeFiles ?? []),
    ];

    return {
      watchPaths: resolveUniqueBuildPaths(
        root,
        watchPaths[0] ? watchPaths : getFallbackWatchPaths(options),
      ),
      outDir: resolveBuildPath(
        root,
        effectiveOptions.outDir ?? options.outDir ?? '.cookbook-router',
      ),
    };
  } catch {
    return {
      watchPaths: resolveUniqueBuildPaths(root, getFallbackWatchPaths(options)),
      outDir: resolveBuildPath(root, options.outDir ?? '.cookbook-router'),
    };
  }
}

export function toRouterBuildCliOptions(options: RouterBuildRunnerOptions = {}): CliRouteOptions {
  const routeFiles = normalizeBuilderRouteFiles(options.routeFiles);

  return {
    ...(options.configFile === undefined ? {} : { configFile: options.configFile }),
    ...(routeFiles?.[0] ? { routeFiles } : {}),
    ...(options.outDir === undefined ? {} : { outDir: options.outDir }),
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.fs === undefined ? {} : { fs: options.fs }),
  };
}

export function normalizeBuilderRouteFiles(
  routeFiles: string | readonly string[] | undefined,
): readonly string[] | undefined {
  if (routeFiles === undefined) {
    return undefined;
  }

  return typeof routeFiles === 'string' ? [routeFiles] : routeFiles;
}

export function getFallbackWatchPaths(options: RouterBuildRunnerOptions = {}): readonly string[] {
  const root = options.cwd ?? '.';
  const routeFiles = normalizeBuilderRouteFiles(options.routeFiles);
  const configWatchPaths =
    options.configFile === undefined
      ? getRouterConfigWatchCandidates(root)
      : [resolveBuildPath(root, options.configFile)];
  const routeWatchPaths = routeFiles?.[0]
    ? getRouteFilePatternWatchPaths({ patterns: routeFiles, cwd: root }).map((path) =>
        resolveBuildPath(root, path),
      )
    : [];

  return [...new Set([...configWatchPaths, ...routeWatchPaths])];
}

export function resolveUniqueBuildPaths(root: string, paths: readonly string[]): readonly string[] {
  return [...new Set(paths.map((path) => resolveBuildPath(root, path)))];
}

export function resolveBuildPath(root: string, path: string): string {
  if (isAbsolute(path)) {
    return resolve(path);
  }

  const normalizedRoot = normalizeBuildPath(resolve(root));
  const normalizedPath = normalizeBuildPath(resolve(path));

  if (normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return resolve(path);
  }

  return resolve(root, path);
}

export function normalizeBuildPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function formatRouterBuildErrors(errors: readonly string[]): string {
  return errors.map((error) => `[cookbook-router] ${error}`).join('\n');
}
