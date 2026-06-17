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
cookbook-router init
cookbook-router init --config router.config.ts --routes "app/**/*.route.{ts,tsx}" --out-dir .generated/router
cookbook-router generate --cwd apps/dashboard --json
```

| Command    | Purpose                                                                      | Writes files |
| ---------- | ---------------------------------------------------------------------------- | ------------ |
| `generate` | Generate `contracts.ts`, `register.d.ts`, and `manifest.json`.               | Yes          |
| `validate` | Validate route files without writing output.                                 | No           |
| `manifest` | Generate `manifest.json` only.                                               | Yes          |
| `init`     | Create a config, starter route file, package scripts, and initial artifacts. | Yes          |

`init` detects common source roots before writing a starter route. If an existing `app/` directory is present, it writes `app/root.route.tsx` and configures `routeFiles: 'app/**/*.route.{ts,tsx,js,jsx,mts,cts,mjs,cjs}'`; otherwise it falls back to `src/`. This prevents app-directory projects from receiving an unexpected new `src/` directory. `init` also accepts `--config <file>`, repeated `--routes <file>`, and `--out-dir <dir>` so projects can choose the config filename, route-file locations, and generated artifact directory up front. When custom route globs are provided, `init` does not create a starter route outside those globs.

Options:

| Option            | Purpose                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `--config <file>` | Config file to load or create. Defaults to `cookbook-router.config.*` for most commands and `cookbook-router.config.ts` for `init`. |
| `--routes <file>` | Route source file or glob. May be repeated.                                                                                         |
| `--routes=<file>` | Equals-form route source file or glob. May be repeated.                                                                             |
| `--out-dir <dir>` | Generated output directory. Defaults to `.cookbook-router`.                                                                         |
| `--out-dir=<dir>` | Equals-form output directory.                                                                                                       |
| `--watch`         | Watch for file changes when used with `generate`.                                                                                   |
| `--cwd <dir>`     | Resolve config, routes, and output paths from a project directory.                                                                  |
| `--json`          | Print the command result as JSON.                                                                                                   |
| `--verbose`       | Include stack/cause details for command failures when available.                                                                    |
| `-h`, `--help`    | Show help.                                                                                                                          |
| `-v`, `--version` | Show version.                                                                                                                       |

## Route files

Route files may be JSON, JavaScript, TypeScript, or TSX modules. Config files can be exported inline or through a local static default identifier, and can use inline static string/string-array `routeFiles` / `outDir` values or local static constants, including shorthand properties such as `{ routeFiles, outDir }`. Function calls and other computed expressions are rejected for those config fields. The normal app shape is a static `defineRoutes([...])` call:

```tsx
import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'home', path: '/', view: HomePage },
  { id: 'users.show', path: '/users/{id:int}', view: UserPage },
] as const);
```

The extractor expects a static `defineRoutes([...])` call, a static `defineRouteTree({ routes: [...] })` call, colocated exported `defineRoute({...})` declarations, named export aliases such as `export { appRoutes as routes }`, or a static `routes = [...]` array. Avoid runtime-generated route trees in files consumed by the CLI. URL state descriptors must also stay static: use route `path`, `search`, `hash`, and `url` objects rather than URLKit runtime builders.

Imported route views are supported. The static extractor replaces view-bearing fields such as `view`, `layout.view`, slot views, `loading`, `error`, and `intercepts.*.view` with placeholders before evaluating route metadata. Imports that are required by static metadata, such as statically declared `defineRoute()`, `defineSearch()`, `mergeSearch()`, `defineHash()` values and static data constants, must use relative or absolute file paths. Path aliases such as `@/` and bare package imports are rejected for static metadata, but remain fine for runtime-only values such as components.

Generated contracts are URLKit-backed. Built-in parsed path constraints such as `{id:int}`, `{price:decimal}`, `{price:range(1,100)}`, `{price:min(1)}`, and `{price:max(100)}` generate `number` params, while `uuid`, `minlength`, `maxlength`, `list`, `regex`, and custom constraints generate `string` params unless the same chain also includes a numeric built-in constraint. Static `date` and `date-time` search descriptors generate `Date` values. Unix timestamp search params use `{ type: 'date', format: 'unix-seconds' }` or `{ type: 'date', format: 'unix-ms' }` and also generate `Date` values that URLKit parses and serializes with UTC semantics.

```tsx
export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{price:int}',
    search: {
      page: { type: 'int', default: 1 },
      tags: { type: 'string', many: true },
    },
    hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
    url: { arrayFormat: 'comma' },
  },
] as const);
```

This generates params like `{ price: number }`, search like `{ page: number; tags: readonly string[] }`, and preserves route-level URL options in `manifest.json` for manifest-based runtimes. Unsupported runtime builders such as `int().default(1)` are rejected in CLI-consumed static route files; use `{ type: 'int', default: 1 }` instead.

When route paths use custom path constraints, declare them in the second `defineRoutes` argument. The CLI reads `pathConstraints` from the route file, so no `--constraints` flag is needed. Custom-constrained params are emitted as `string` in generated contracts.

```tsx
import { createPathConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};

export const routes = defineRoutes(
  [{ id: 'posts.show', path: '/posts/{slug:slug}', view: PostPage }] as const,
  { pathConstraints: constraints },
);
```

Inline static constraint objects are also supported. `pathConstraints` can be written as shorthand (`{ pathConstraints }`) or as an explicit property (`{ pathConstraints: constraints }`) when the referenced value is a static object declaration. Static `pathOptions` declarations are supported the same way. Dynamic declarations that cannot be statically evaluated fail with a clear error.

`pathOptions` and custom constraint names are not silently overwritten. If config and route source files provide conflicting `pathOptions`, or if more than one source defines the same custom constraint name, generation fails before writing artifacts. Centralize those options in `cookbook-router.config.ts` unless every source uses the exact same `pathOptions` and unique constraint names.

For colocated `defineRoute()` files configured through `cookbook-router.config.ts`, put runtime custom constraints in a runtime-safe module and import that object into the config. The generated `routes.ts` file imports the same object and passes it to `defineRouteTree()`, avoiding a runtime import of `@cookbook/router-cli` or the config file.

```ts
// src/path-constraints.ts
import { createPathConstraint } from '@cookbook/router';

export const pathConstraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};
```

```ts
// cookbook-router.config.ts
import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './src/path-constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathConstraints,
} as const);
```

## Generated files

```txt
.cookbook-router/
  routes.ts
  contracts.ts
  register.d.ts
  manifest.json
```

`cbr init` updates `tsconfig.json` when the file exists so the detected source root and generated output directory are included. For manual setup, include generated files in the app `tsconfig.json`:

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

`routes.ts` is generated when route files export colocated `defineRoute()` declarations, manual `defineRouteTree()` exports, or static `defineRoutes()` trees. Colocated declarations are composed with `defineRouteTree()`, multiple pure static tree exports are combined with `defineRoutes()`, and a single static tree export is re-exported directly when that is needed to preserve source-level route options. `contracts.ts` contains route-specific type-only contracts. Path params, search values, and hash values follow URLKit static parsing semantics. `register.d.ts` augments `@cookbook/router` and `@cookbook/router-react`. `manifest.json` contains a tooling-friendly route list and includes route-level `url` options such as `arrayFormat`, `defaults`, `invalidSearch`, `invalidHash`, and `unknownSearch` when configured. The focused `@cookbook/router-react/hooks` entrypoint consumes the same shared contract registry, so generated hook inference is preserved for subpath imports.

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
  readonly changedFiles?: readonly string[];
}

function generateCommand(options: GenerateOptions): Promise<CommandResult>;
function manifestCommand(options: ManifestOptions): Promise<CommandResult>;
function validateCommand(options: ValidateOptions): Promise<CommandResult>;
function watchCommand(options: WatchCommandOptions): WatchHandle;
function resolveRoutes(options: CliRouteOptions): Promise<readonly RouteDefinition[]>;
```

`watchCommand()` requires `routeFiles` because in-memory route arrays cannot be watched. It generates once, watches route files/config roots, debounces rapid file-system events, refreshes watched roots when config `routeFiles` changes, calls `onChange` for the initial result and every regeneration, and returns:

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
  generateRouterArtifacts,
  serializeManifest,
} from '@cookbook/router-cli';

const contractsSource = generateContracts(routes);
const registerSource = generateRegister();
const manifest = generateManifest(routes);
const manifestJson = serializeManifest(manifest);

await generateRouterArtifacts({ routeFiles: ['src/**/*.route.tsx'] });
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
- `validate` writes no files. Static `defineRoutes()` files keep static nested-tree semantics; only files that actually use modular composition fields such as `parent` or `order` are resolved through `defineRouteTree()`. Route-file `pathOptions` and custom path constraint names are checked for conflicts before validation continues.
- `generate` and `manifest` print generated files on success.

The package also exports `runCli(argv, runnerOptions?)` and `shouldRunCli(moduleUrl?, argv?)` for custom executable wrappers and tests.

## Troubleshooting

- If a route file cannot be evaluated, simplify the route declaration into a static array and replace URLKit runtime builders with static descriptors.
- If contracts are stale, rerun `generate` once to see diagnostics, then use `watch` during development.
- If generated types are not visible, include generated files in `tsconfig.json`.
- Default slot views do not generate route IDs; only entries under `layout.slots.<name>.routes` are navigable routes.
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
