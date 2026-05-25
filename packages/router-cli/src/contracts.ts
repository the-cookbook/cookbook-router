import type { RouteDefinition } from '@cookbook/router';

export interface Register {}

export interface RouterContracts {}

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

export interface RouteFile {
  readonly routes: readonly RouteDefinition[];
}

export interface CliRouteSource {
  readonly path: string;
  readonly routes: readonly RouteDefinition[];
}

export interface LoadRouteFilesOptions {
  readonly routeFiles: readonly string[];
  readonly fs?: CliFileSystem;
}

export interface CliOutputOptions {
  readonly outDir?: string;
  readonly fs?: CliFileSystem;
}

export interface CliRouteOptions extends CliOutputOptions {
  readonly routes?: readonly RouteDefinition[];
  readonly routeFiles?: readonly string[];
}

export interface CommandResult {
  readonly ok: boolean;
  readonly files: readonly string[];
  readonly errors: readonly string[];
}

export interface WatchOptions extends CliRouteOptions {
  readonly debounceMs?: number;
  readonly onChange?: (result: CommandResult) => void | Promise<void>;
}

export interface WatchHandle {
  readonly initial: Promise<CommandResult>;
  close: () => void;
}
