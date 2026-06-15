import type { DefineRoutesOptions, RouteDefinition } from '@cookbook/router';

/** Module augmentation entrypoint reserved for CLI-generated contracts. */
export interface Register {}

/** Placeholder shape re-exported for generated register files. */
export interface RouterContracts {}

/** Authored configuration consumed by @cookbook/router-cli. */
export interface RouterCliConfig extends DefineRoutesOptions {
  /** Route source file, glob, or list of route source files/globs. */
  readonly routeFiles?: string | readonly string[];
  /** Directory where generated router artifacts are written. */
  readonly outDir?: string;
}

/** Static runtime import rendered into generated `.cookbook-router/routes.ts`. */
export interface RuntimeImportReference {
  /** Runtime-safe module path resolved relative to the project/config root. */
  readonly path: string;
  /** Export name to import from the runtime-safe module. */
  readonly exportName: string;
}

/** Runtime-only route-tree options that generated route modules can import safely. */
export interface GeneratedRouteTreeRuntimeOptions {
  readonly pathConstraints?: RuntimeImportReference;
}

/** Loaded router config plus the file it came from. */
export interface LoadedRouterConfig {
  readonly config: RouterCliConfig;
  readonly configFile: string;
  readonly rootDir: string;
  readonly runtimeRouteOptions?: GeneratedRouteTreeRuntimeOptions;
}

/**
 * File-system abstraction used by CLI commands.
 *
 * Tests and alternate runtimes can inject this instead of touching Node's real
 * file system. Watch support is optional and only required by watch mode.
 */
export interface CliFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  mkdir(path: string, options?: { readonly recursive?: boolean }): Promise<void>;
  readdir?(path: string, options?: { readonly withFileTypes?: false }): Promise<readonly string[]>;
  stat?(path: string): Promise<{
    readonly mtimeMs?: number;
    readonly isDirectory?: () => boolean;
    readonly isFile?: () => boolean;
  }>;
  watch?(
    path: string,
    listener: (event: 'rename' | 'change', filename: string | null) => void,
  ): { close: () => void };
}

/** Export discovered in a CLI-consumed route source. */
export interface RouteFileExport {
  readonly exportName: string;
  readonly kind: 'route' | 'routes' | 'routeTree';
}

/** Route module loaded by the CLI, including `defineRoutes` options. */
export interface RouteFile {
  readonly routes: readonly RouteDefinition[];
  readonly routeOptions?: DefineRoutesOptions;
  readonly routeExports?: readonly RouteFileExport[];
  readonly routeSources?: readonly CliRouteSource[];
}

/** Route source with its originating path and route options. */
export interface CliRouteSource {
  readonly path: string;
  readonly routes: readonly RouteDefinition[];
  readonly routeOptions?: DefineRoutesOptions;
  readonly routeExports?: readonly RouteFileExport[];
}

/** Options for loading TypeScript route modules from disk. */
export interface LoadRouteFilesOptions {
  readonly routeFiles: readonly string[];
  readonly fs?: CliFileSystem;
}

/** Shared output options for CLI commands that write generated files. */
export interface CliOutputOptions {
  readonly outDir?: string;
  readonly fs?: CliFileSystem;
}

/**
 * Shared route input options for CLI commands.
 *
 * Commands can receive routes directly or load one or more route files.
 * `routeOptions`, especially `pathConstraints`, must be respected during
 * validation and generation.
 */
export interface CliRouteOptions extends CliOutputOptions {
  readonly routes?: readonly RouteDefinition[];
  readonly routeFiles?: readonly string[];
  readonly routeFileWatchPaths?: readonly string[];
  readonly routeOptions?: DefineRoutesOptions;
  readonly configFile?: string;
  readonly cwd?: string;
  /** Print additional error context when supported by the command. */
  readonly verbose?: boolean;
  /** Internal option used by watchers to observe glob roots before files exist. */
  readonly allowEmptyRouteFiles?: boolean;
  /** Internal metadata used to preserve runtime-safe generated route-tree imports. */
  readonly runtimeRouteOptions?: GeneratedRouteTreeRuntimeOptions;
}

/**
 * Result returned by CLI commands.
 *
 * `files` lists written artifacts on success. `errors` contains user-facing
 * messages on failure.
 */
export interface CommandResult {
  readonly ok: boolean;
  readonly files: readonly string[];
  readonly errors: readonly string[];
  /** Files whose contents changed during a successful write command. */
  readonly changedFiles?: readonly string[];
}

/** Options for watch mode generation. */
export interface WatchOptions extends CliRouteOptions {
  readonly debounceMs?: number;
  readonly onChange?: (result: CommandResult) => void | Promise<void>;
}

/** Handle returned by watch mode for the initial run and cleanup. */
export interface WatchHandle {
  readonly initial: Promise<CommandResult>;
  close: () => void;
}
