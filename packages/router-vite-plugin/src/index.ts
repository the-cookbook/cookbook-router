import { isAbsolute, resolve } from 'node:path';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import {
  generateRouterArtifacts,
  getRouterConfigWatchCandidates,
  getRouteFilePatternWatchPaths,
  resolveEffectiveRouteOptions,
  type CliFileSystem,
  type CliRouteOptions,
  type CommandResult,
} from '@cookbook/router-cli';

export interface CookbookRouterVitePluginOptions {
  /** Router config file. Defaults to cookbook-router.config.* discovery from the Vite root. */
  readonly configFile?: string;
  /** Route source files or globs. Overrides routeFiles from config when provided. */
  readonly routeFiles?: string | readonly string[];
  /** Generated output directory. Defaults to config outDir or .cookbook-router. */
  readonly outDir?: string;
  /** Debounce interval for dev-server regeneration. */
  readonly debounceMs?: number;
  /** File-system adapter for tests and non-standard runtimes. */
  readonly fs?: CliFileSystem;
}

const DEFAULT_DEBOUNCE_MS = 50;
/** Vite plugin that generates Cookbook Router physical artifacts before dev/build compilation. */
export function cookbookRouterVitePlugin(options: CookbookRouterVitePluginOptions = {}): Plugin {
  let config: ResolvedConfig | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let rerunRequested = false;
  let activeWatchPaths = new Set<string>();
  let activeOutDirs = new Set<string>();

  const resolveCliOptions = (): CliRouteOptions => {
    const routeFiles = normalizeRouteFiles(options.routeFiles);

    return {
      ...(options.configFile === undefined ? {} : { configFile: options.configFile }),
      ...(routeFiles?.[0] ? { routeFiles } : {}),
      ...(options.outDir === undefined ? {} : { outDir: options.outDir }),
      cwd: config?.root ?? process.cwd(),
      ...(options.fs === undefined ? {} : { fs: options.fs }),
    };
  };

  const runGeneration = async (): Promise<CommandResult> => {
    try {
      const result = await generateRouterArtifacts(resolveCliOptions());

      if (!result.ok) {
        reportErrors(result.errors, config);
      }

      return result;
    } catch (error) {
      const result = failure(error instanceof Error ? error.message : String(error));
      reportErrors(result.errors, config);
      return result;
    }
  };

  const resolveWatchState = async (): Promise<WatchState> => {
    const root = config?.root ?? process.cwd();

    try {
      const effectiveOptions = await resolveEffectiveRouteOptions({
        ...resolveCliOptions(),
        allowEmptyRouteFiles: true,
      });
      const watchPaths = [
        ...(effectiveOptions.configFile === undefined ? [] : [effectiveOptions.configFile]),
        ...(effectiveOptions.routeFileWatchPaths ?? effectiveOptions.routeFiles ?? []),
      ];
      const resolvedWatchPaths = watchPaths[0]
        ? watchPaths.map((path) => resolveFromRoot(root, path))
        : getFallbackWatchPaths(root, options);

      return {
        watchPaths: resolvedWatchPaths,
        outDir: resolveFromRoot(root, effectiveOptions.outDir ?? '.cookbook-router'),
      };
    } catch (error) {
      reportErrors([error instanceof Error ? error.message : String(error)], config);

      return {
        watchPaths: getFallbackWatchPaths(root, options),
        outDir: resolveFromRoot(root, options.outDir ?? '.cookbook-router'),
      };
    }
  };

  const refreshWatchedPaths = async (server: ViteDevServer): Promise<void> => {
    const watchState = await resolveWatchState();
    const nextOutDirs = new Set([normalizePath(resolve(watchState.outDir))]);
    const nextWatchPaths = new Set(
      [...watchState.watchPaths, watchState.outDir].map((path) => normalizePath(resolve(path))),
    );
    const staleWatchPaths = [...activeWatchPaths].filter((path) => !nextWatchPaths.has(path));
    const newWatchPaths = [...nextWatchPaths].filter((path) => !activeWatchPaths.has(path));

    for (const staleWatchPath of staleWatchPaths) {
      server.watcher.unwatch(staleWatchPath);
    }

    if (newWatchPaths[0]) {
      server.watcher.add(newWatchPaths);
    }

    activeWatchPaths = nextWatchPaths;
    activeOutDirs = nextOutDirs;
  };

  const scheduleGeneration = (server: ViteDevServer): void => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      void runAndReload(server);
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  };

  const runAndReload = async (server: ViteDevServer): Promise<void> => {
    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;

    try {
      const result = await runGeneration();
      await refreshWatchedPaths(server);

      if (result.ok) {
        server.ws.send({ type: 'full-reload' });
      }
    } finally {
      running = false;

      if (rerunRequested) {
        rerunRequested = false;
        scheduleGeneration(server);
      }
    }
  };

  return {
    name: 'cookbook-router-vite-plugin',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async buildStart() {
      const result = await runGeneration();

      if (!result.ok && config?.command === 'build') {
        throw new Error(result.errors.join('\n'));
      }
    },

    async configureServer(server: ViteDevServer) {
      server.watcher.on('all', (event: string, changedPath: string) => {
        if (isInsideAnyOutputDirectory(changedPath, activeOutDirs)) {
          if (isDeletionEvent(event)) {
            activeWatchPaths = removeOutputDirectoriesFromWatchPaths(
              activeWatchPaths,
              activeOutDirs,
            );
            scheduleGeneration(server);
          }

          return;
        }

        if (!isWatchedPath(changedPath, activeWatchPaths)) {
          return;
        }

        scheduleGeneration(server);
      });

      const result = await runGeneration();
      await refreshWatchedPaths(server);

      if (!result.ok && config?.command === 'build') {
        throw new Error(result.errors.join('\n'));
      }
    },
  };
}

interface WatchState {
  readonly watchPaths: readonly string[];
  readonly outDir: string;
}

function getFallbackWatchPaths(
  root: string,
  options: CookbookRouterVitePluginOptions,
): readonly string[] {
  const configWatchPaths =
    options.configFile === undefined
      ? getRouterConfigWatchCandidates(root).map((path) => resolveFromRoot(root, path))
      : [resolveFromRoot(root, options.configFile)];
  const routeFiles = normalizeRouteFiles(options.routeFiles);
  const routeWatchPaths = routeFiles?.[0]
    ? getRouteFilePatternWatchPaths({ patterns: routeFiles, cwd: root }).map((path) =>
        resolveFromRoot(root, path),
      )
    : [];

  return [...new Set([...configWatchPaths, ...routeWatchPaths])];
}

function resolveFromRoot(root: string, path: string): string {
  if (isAbsolute(path)) {
    return resolve(path);
  }

  const normalizedRoot = normalizePath(resolve(root));
  const normalizedPath = normalizePath(resolve(path));

  if (normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return resolve(path);
  }

  return resolve(root, path);
}

function isWatchedPath(path: string, watchPaths: ReadonlySet<string>): boolean {
  const normalizedPath = normalizePath(resolve(path));

  for (const watchPath of watchPaths) {
    if (normalizedPath === watchPath || normalizedPath.startsWith(`${watchPath}/`)) {
      return true;
    }
  }

  return false;
}

function isDeletionEvent(event: string): boolean {
  return event === 'unlink' || event === 'unlinkDir';
}

function removeOutputDirectoriesFromWatchPaths(
  watchPaths: ReadonlySet<string>,
  outDirs: ReadonlySet<string>,
): Set<string> {
  return new Set([...watchPaths].filter((watchPath) => !outDirs.has(watchPath)));
}

function isInsideAnyOutputDirectory(path: string, outDirs: ReadonlySet<string>): boolean {
  const normalizedPath = normalizePath(resolve(path));

  for (const outDir of outDirs) {
    if (normalizedPath === outDir || normalizedPath.startsWith(`${outDir}/`)) {
      return true;
    }
  }

  return false;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function reportErrors(errors: readonly string[], config: ResolvedConfig | undefined): void {
  for (const error of errors) {
    const message = `[cookbook-router] ${error}`;

    if (config?.logger?.error) {
      config.logger.error(message);
      continue;
    }

    process.stderr.write(`${message}\n`);
  }
}

function normalizeRouteFiles(
  routeFiles: string | readonly string[] | undefined,
): readonly string[] | undefined {
  if (routeFiles === undefined) {
    return undefined;
  }

  return typeof routeFiles === 'string' ? [routeFiles] : routeFiles;
}

function failure(message: string): CommandResult {
  return { ok: false, files: [], errors: [message] };
}
