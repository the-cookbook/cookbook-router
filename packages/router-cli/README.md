# @cookbook/router-cli

Developer tooling for Cookbook Router route contracts and manifests.

Use this package to generate app-specific TypeScript contracts, `register.d.ts`, and route manifests from `@cookbook/router` route definitions.

## Table of contents

- [Install](#install)
- [Requirements](#requirements)
- [Binaries](#binaries)
- [Commands](#commands)
- [Route files](#route-files)
- [Generated files](#generated-files)
- [Programmatic API](#programmatic-api)
- [Programmatic generation API](#programmatic-generation-api)
- [Custom file systems](#custom-file-systems)
- [CI usage](#ci-usage)
- [Exit behavior](#exit-behavior)
- [Troubleshooting](#troubleshooting)
- [Related docs](#related-docs)

## Install

```sh
pnpm add -D @cookbook/router-cli
```

Route files commonly import `defineRoutes` from `@cookbook/router`:

```sh
pnpm add @cookbook/router
```

## Requirements

- Node.js `>=22.22.1`
- TypeScript project for generated contracts
- Static route declarations for best extraction results
- Package binaries available as `cookbook-router` and `cbr`

## Binaries

```sh
cookbook-router --help
cbr --help
```

`cbr` is a shorthand alias for `cookbook-router`.

## Commands

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router watch --routes src/routes.tsx --out-dir .cookbook-router
```

| Command    | Purpose                                                        | Writes files |
| ---------- | -------------------------------------------------------------- | ------------ |
| `generate` | Generate `contracts.ts`, `register.d.ts`, and `manifest.json`. | Yes          |
| `validate` | Validate route files without writing output.                   | No           |
| `manifest` | Generate `manifest.json` only.                                 | Yes          |
| `watch`    | Generate once, then regenerate on route file changes.          | Yes          |

Options:

| Option            | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `--routes <file>` | Route source file. May be repeated.                         |
| `--routes=<file>` | Equals-form route source file. May be repeated.             |
| `--out-dir <dir>` | Generated output directory. Defaults to `.cookbook-router`. |
| `--out-dir=<dir>` | Equals-form output directory.                               |
| `-h`, `--help`    | Show help.                                                  |
| `-v`, `--version` | Show version.                                               |

## Route files

Route files may be JSON, JavaScript, TypeScript, or TSX modules. The normal app shape is a static `defineRoutes([...])` call:

```tsx
import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'home', path: '/', component: HomePage },
  { id: 'users.show', path: '/users/{id:int}', component: UserPage },
] as const);
```

The extractor expects a static `defineRoutes([...])` call or a static `routes = [...]` array. Avoid runtime-generated route trees in files consumed by the CLI.

## Generated files

```txt
.cookbook-router/
  contracts.ts
  register.d.ts
  manifest.json
```

Include generated files in the app `tsconfig.json`:

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

`contracts.ts` contains route-specific types and route constants. `register.d.ts` augments `@cookbook/router`. `manifest.json` contains a tooling-friendly route list.

## Programmatic API

```ts
import {
  generateCommand,
  manifestCommand,
  validateCommand,
  watchCommand,
} from '@cookbook/router-cli';

await validateCommand({ routeFiles: ['src/routes.tsx'] });
await generateCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });
await manifestCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });

const watcher = watchCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });
await watcher.initial;
watcher.close();
```

Command signatures:

```ts
interface CliRouteOptions {
  readonly routes?: readonly RouteDefinition[];
  readonly routeFiles?: readonly string[];
  readonly outDir?: string;
  readonly fs?: CliFileSystem;
}

interface CommandResult {
  readonly ok: boolean;
  readonly files: readonly string[];
  readonly errors: readonly string[];
}

function generateCommand(options: GenerateOptions): Promise<CommandResult>;
function manifestCommand(options: ManifestOptions): Promise<CommandResult>;
function validateCommand(options: ValidateOptions): Promise<CommandResult>;
function watchCommand(options: WatchCommandOptions): WatchHandle;
function resolveRoutes(options: CliRouteOptions): Promise<readonly RouteDefinition[]>;
```

`watchCommand()` returns:

```ts
interface WatchHandle {
  readonly initial: Promise<CommandResult>;
  close: () => void;
}
```

## Programmatic generation API

```ts
import {
  generateContracts,
  generateManifest,
  generateRegister,
  serializeManifest,
} from '@cookbook/router-cli';

const contractsSource = generateContracts(routes);
const registerSource = generateRegister();
const manifest = generateManifest(routes);
const manifestJson = serializeManifest(manifest);
```

Signatures:

```ts
function generateContracts(routes: readonly RouteDefinition[]): string;
function generateRegister(): string;
function generateManifest(routes: readonly RouteDefinition[]): RouteManifest;
function serializeManifest(manifest: RouteManifest): string;
```

Manifest shape:

```ts
interface ManifestRoute {
  readonly id: string;
  readonly path?: string;
  readonly parentId?: string;
  readonly index: boolean;
}

interface RouteManifest {
  readonly routes: readonly ManifestRoute[];
}
```

## Custom file systems

Programmatic APIs accept an optional `fs` adapter for tests and build integrations.

```ts
interface CliFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  mkdir(path: string, options?: { readonly recursive?: boolean }): Promise<void>;
  stat?(path: string): Promise<{ readonly mtimeMs?: number }>;
  watch?(
    path: string,
    listener: (event: 'rename' | 'change', filename: string | null) => void,
  ): { close: () => void };
}
```

Route loading helpers:

```ts
function loadRouteFiles(options: LoadRouteFilesOptions): Promise<readonly CliRouteSource[]>;
function validateRouteFiles(options: LoadRouteFilesOptions): Promise<readonly CliRouteSource[]>;
```

## CI usage

Recommended sequence:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
pnpm typecheck
pnpm test
pnpm build
```

With package scripts:

```json
{
  "scripts": {
    "routes:generate": "cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router",
    "routes:validate": "cookbook-router validate --routes src/routes.tsx"
  }
}
```

## Exit behavior

- Successful commands exit `0`.
- Invalid options, unknown commands, route validation errors, and generation errors exit `1`.
- `validate` writes no files.
- `generate` and `manifest` print generated files on success.
- `watch` reports the initial generation status and then handles file changes.

The package also exports `runCli(argv, runnerOptions?)` and `shouldRunCli(moduleUrl?, argv?)` for custom executable wrappers and tests.

## Troubleshooting

- If a route file cannot be evaluated, simplify the route declaration into a static array.
- If contracts are stale, rerun `generate` or use `watch` during development.
- If generated types are not visible, include generated files in `tsconfig.json`.
- If a slot fallback ID is not generated, that is expected; fallbacks are not navigable routes.
- If a command exits with `--routes requires a file path`, pass at least one route file with `--routes`.
- If a generated output path is rejected, ensure `--out-dir` does not overlap with route source files.

## Related docs

- [Repository README](../../README.md)
- [API reference](../../docs/api.md#cookbookrouter-cli)
- [Code generation](../../docs/codegen.md)
- [Contracts](../../docs/contracts.md)
- [Routing](../../docs/routing.md)
- [Testing](../../docs/testing.md)
- [Troubleshooting](../../docs/troubleshooting.md)
