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

- Node.js `>=18`
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
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
```

| Command    | Purpose                                                        | Writes files |
| ---------- | -------------------------------------------------------------- | ------------ |
| `generate` | Generate `contracts.ts`, `register.d.ts`, and `manifest.json`. | Yes          |
| `validate` | Validate route files without writing output.                   | No           |
| `manifest` | Generate `manifest.json` only.                                 | Yes          |

Options:

| Option            | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `--routes <file>` | Route source file. May be repeated.                         |
| `--routes=<file>` | Equals-form route source file. May be repeated.             |
| `--out-dir <dir>` | Generated output directory. Defaults to `.cookbook-router`. |
| `--out-dir=<dir>` | Equals-form output directory.                               |
| `--watch`         | Watch for files changes when used with generate             |
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

The extractor expects a static `defineRoutes([...])` call or a static `routes = [...]` array. Avoid runtime-generated route trees in files consumed by the CLI. URL state descriptors must also stay static: use route `path`, `search`, `hash`, and `url` objects rather than URLKit runtime builders.

Generated contracts are URLKit-backed. Built-in parsed path constraints such as `{id:int}`, `{price:decimal}` and `{price:number}` generate `number` params, while custom constraints generate `string` params unless URLKit exposes typed static inference for those constraints.

```tsx
export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{price:int}',
    search: {
      page: { value: 'int', default: 1 },
      tags: { value: 'string', type: 'many' },
    },
    hash: ['details', 'reviews'],
    url: { arrayFormat: 'comma' },
  },
] as const);
```

This generates params like `{ price: number }`, search like `{ page: number; tags: readonly string[] }`, and preserves route-level URL options in `manifest.json` for manifest-based runtimes. Unsupported runtime builders such as `int().default(1)` are rejected in CLI-consumed static route files; use `{ value: 'int', default: 1 }` instead.

When route paths use custom path constraints, declare them in the second `defineRoutes` argument. The CLI reads `pathConstraints` from the route file, so no `--constraints` flag is needed. Custom-constrained params are emitted as `string` in generated contracts.

```tsx
import { createConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};

export const routes = defineRoutes(
  [{ id: 'posts.show', path: '/posts/{slug:slug}', component: PostPage }] as const,
  { pathConstraints: constraints },
);
```

Inline static constraint objects are also supported. Dynamic constraint declarations that cannot be statically evaluated fail with a clear error.

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

`contracts.ts` contains route-specific types and route constants. Path params, search values, and hash values follow URLKit static parsing semantics. `register.d.ts` augments `@cookbook/router`. `manifest.json` contains a tooling-friendly route list and includes route-level `url` options such as `arrayFormat`, `invalidSearch`, `invalidHash`, and `unknownSearch` when configured.

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
  readonly routeOptions?: DefineRoutesOptions;
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

`watchCommand()` requires `routeFiles` because in-memory route arrays cannot be watched. It generates once, registers one watcher per route file, debounces rapid file-system events, calls `onChange` for the initial result and every regeneration, and returns:

```ts
interface WatchOptions extends CliRouteOptions {
  readonly debounceMs?: number;
  readonly onChange?: (result: CommandResult) => void | Promise<void>;
}

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
function generateContracts(
  routes: readonly RouteDefinition[],
  options?: DefineRoutesOptions | RouterPathOptions,
): string;
function generateRegister(): string;
function generateManifest(
  routes: readonly RouteDefinition[],
  options?: DefineRoutesOptions | RouterPathOptions,
): RouteManifest;
function serializeManifest(manifest: RouteManifest): string;
```

Manifest shape:

```ts
interface ManifestRoute {
  readonly id: string;
  readonly path?: string;
  readonly parentId?: string;
  readonly index: boolean;
  readonly url?: RouterUrlOptions;
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

The package also exports `runCli(argv, runnerOptions?)` and `shouldRunCli(moduleUrl?, argv?)` for custom executable wrappers and tests.

## Troubleshooting

- If a route file cannot be evaluated, simplify the route declaration into a static array and replace URLKit runtime builders with static descriptors.
- If contracts are stale, rerun `generate` once to see diagnostics, then use `watch` during development.
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
