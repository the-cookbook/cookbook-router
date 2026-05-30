import type { DefineRoutesOptions, RouteDefinition } from '@cookbook/router';

/** Module augmentation entrypoint reserved for CLI-generated contracts. */
export interface Register {}

/** Placeholder shape re-exported for generated register files. */
export interface RouterContracts {}

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
  stat?(path: string): Promise<{ readonly mtimeMs?: number }>;
  watch?(
    path: string,
    listener: (event: 'rename' | 'change', filename: string | null) => void,
  ): { close: () => void };
}

/** Route module loaded by the CLI, including `defineRoutes` options. */
export interface RouteFile {
  readonly routes: readonly RouteDefinition[];
  readonly routeOptions?: DefineRoutesOptions;
}

/** Route source with its originating path and route options. */
export interface CliRouteSource {
  readonly path: string;
  readonly routes: readonly RouteDefinition[];
  readonly routeOptions?: DefineRoutesOptions;
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
  readonly routeOptions?: DefineRoutesOptions;
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
