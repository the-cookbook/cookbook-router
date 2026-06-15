import {
  createRouterBuildRunner,
  formatRouterBuildErrors,
  normalizeBuildPath,
  resolveBuildPath,
  resolveRouterBuildWatchState,
  type RouterBuildRunnerOptions,
} from './create-router-build-runner';

const DEFAULT_PLUGIN_NAME = 'CookbookRouterPlugin';

export interface RouterCompilerBuildHooksOptions extends RouterBuildRunnerOptions {
  readonly pluginName?: string;
}

type WatchIgnoredEntry = string | RegExp;
type WatchIgnored = WatchIgnoredEntry | readonly WatchIgnoredEntry[] | ((path: string) => boolean);

interface RouterCompilerHook<Arguments extends readonly unknown[]> {
  tapPromise(name: string, handler: (...args: Arguments) => Promise<void>): void;
}

interface RouterCompilerHooks<Compiler, Compilation> {
  readonly beforeRun: RouterCompilerHook<[Compiler]>;
  readonly watchRun: RouterCompilerHook<[Compiler]>;
  readonly afterCompile: RouterCompilerHook<[Compilation]>;
}

interface RouterCompilerOptions {
  context?: string;
  watchOptions?: {
    ignored?: WatchIgnored;
  };
}

interface RouterCompilerLogger {
  error?(message: string): void;
}

interface RouterCompilerLike<Compiler, Compilation> {
  readonly context?: string;
  readonly options: RouterCompilerOptions;
  readonly hooks: RouterCompilerHooks<Compiler, Compilation>;
  getInfrastructureLogger?(name: string): RouterCompilerLogger;
}

interface RouterCompilationLike {
  readonly fileDependencies?: { add(path: string): unknown };
  readonly contextDependencies?: { add(path: string): unknown };
  readonly missingDependencies?: { add(path: string): unknown };
}

export function applyRouterCompilerBuildHooks<
  Compiler extends RouterCompilerLike<Compiler, Compilation>,
  Compilation extends RouterCompilationLike,
>(compiler: Compiler, options: RouterCompilerBuildHooksOptions = {}): void {
  const pluginName = options.pluginName ?? DEFAULT_PLUGIN_NAME;
  const resolveOptions = (): RouterCompilerBuildHooksOptions => ({
    ...options,
    cwd: options.cwd ?? getCompilerRoot(compiler),
  });

  const runGeneration = async () => {
    const result = await createRouterBuildRunner(resolveOptions()).run();

    if (!result.ok) {
      reportErrors(result.errors, compiler, pluginName);
    }

    return result;
  };

  compiler.hooks.beforeRun.tapPromise(pluginName, async () => {
    const result = await runGeneration();

    if (!result.ok) {
      throw new Error(result.errors.join('\n'));
    }
  });

  compiler.hooks.watchRun.tapPromise(pluginName, async () => {
    const result = await runGeneration();

    if (result.ok) {
      return;
    }

    // In watch mode, keep previous valid generated files and let the next build recover.
  });

  compiler.hooks.afterCompile.tapPromise(pluginName, async (compilation) => {
    const buildOptions = resolveOptions();
    const root = buildOptions.cwd ?? '.';
    const watchState = await resolveRouterBuildWatchState(buildOptions);

    addCompilationDependencies(compilation, root, watchState.outDir, watchState.watchPaths);
    extendIgnoredWatchOptions(compiler, watchState.outDir);
  });
}

function getCompilerRoot<Compiler, Compilation>(
  compiler: RouterCompilerLike<Compiler, Compilation>,
): string {
  return compiler.options.context ?? compiler.context ?? process.cwd();
}

function addCompilationDependencies(
  compilation: RouterCompilationLike,
  root: string,
  outDir: string,
  watchPaths: readonly string[],
): void {
  const normalizedOutDir = normalizeBuildPath(outDir);

  for (const path of watchPaths) {
    const resolvedPath = resolveBuildPath(root, path);

    if (isInsideOutputDirectory(resolvedPath, normalizedOutDir)) {
      continue;
    }

    if (looksLikeFilePath(path)) {
      compilation.fileDependencies?.add(resolvedPath);
      compilation.missingDependencies?.add(resolvedPath);
      continue;
    }

    compilation.contextDependencies?.add(resolvedPath);
  }
}

function extendIgnoredWatchOptions<Compiler, Compilation>(
  compiler: RouterCompilerLike<Compiler, Compilation>,
  outDir: string,
): void {
  compiler.options.watchOptions ??= {};
  const watchOptions = compiler.options.watchOptions;
  const ignored = watchOptions.ignored;

  if (ignored === undefined) {
    watchOptions.ignored = [outDir];
    return;
  }

  if (isWatchIgnoredEntryList(ignored)) {
    if (!ignored.some((entry) => watchIgnoredEntryEquals(entry, outDir))) {
      watchOptions.ignored = [...ignored, outDir];
    }
    return;
  }

  if (typeof ignored === 'function') {
    watchOptions.ignored = (path: string) => isInsideOutputDirectory(path, outDir) || ignored(path);
    return;
  }

  if (watchIgnoredEntryEquals(ignored, outDir)) {
    return;
  }

  watchOptions.ignored = [ignored, outDir];
}

function isWatchIgnoredEntryList(value: WatchIgnored): value is readonly WatchIgnoredEntry[] {
  return Array.isArray(value);
}

function watchIgnoredEntryEquals(entry: WatchIgnoredEntry, outDir: string): boolean {
  return (
    typeof entry === 'string' &&
    normalizeBuildPath(resolveBuildPath('.', entry)) ===
      normalizeBuildPath(resolveBuildPath('.', outDir))
  );
}

function looksLikeFilePath(path: string): boolean {
  const basename = normalizeBuildPath(path).split('/').pop() ?? '';
  return /\.[A-Za-z0-9]+$/.test(basename);
}

function isInsideOutputDirectory(path: string, outDir: string): boolean {
  const normalizedPath = normalizeBuildPath(resolveBuildPath('.', path));
  const normalizedOutDir = normalizeBuildPath(resolveBuildPath('.', outDir));

  return normalizedPath === normalizedOutDir || normalizedPath.startsWith(`${normalizedOutDir}/`);
}

function reportErrors<Compiler, Compilation>(
  errors: readonly string[],
  compiler: RouterCompilerLike<Compiler, Compilation>,
  pluginName: string,
): void {
  const message = formatRouterBuildErrors(errors);
  const logger = compiler.getInfrastructureLogger?.(pluginName);

  if (logger?.error) {
    logger.error(message);
    return;
  }

  process.stderr.write(`${message}\n`);
}
