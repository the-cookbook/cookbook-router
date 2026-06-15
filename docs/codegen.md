# Code generation

`@cookbook/router-cli` generates TypeScript contracts, a registration declaration, and a route manifest from route definitions.

## Table of contents

- [Commands](#commands)
- [Config file](#config-file)
- [Route file formats](#route-file-formats)
- [Static metadata imports](#static-metadata-imports)
- [Generate](#generate)
- [Validate](#validate)
- [Manifest only](#manifest-only)
- [Watch mode](#watch-mode)
- [Builder plugin options and config discovery](#builder-plugin-options-and-config-discovery)
- [Vite plugin](#vite-plugin)
- [Webpack plugin](#webpack-plugin)
- [Rspack plugin](#rspack-plugin)
- [Rollup and Rolldown plugin](#rollup-and-rolldown-plugin)
- [esbuild plugin](#esbuild-plugin)
- [Bun plugin](#bun-plugin)
- [Programmatic usage](#programmatic-usage)
- [Programmatic generation helpers](#programmatic-generation-helpers)
- [CLI runner helpers](#cli-runner-helpers)
- [Generated output](#generated-output)
- [Static extraction rules](#static-extraction-rules)
- [Safety checks](#safety-checks)
- [Common workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

## Commands

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
cookbook-router init
cookbook-router init --config router.config.ts --routes "app/**/*.route.{ts,tsx}" --out-dir .generated/router
cookbook-router generate --cwd apps/dashboard --json
```

`init` detects common source roots before writing files. If the project already has an `app/` directory, generated config uses `routeFiles: 'app/**/*.route.{ts,tsx,js,jsx,mts,cts,mjs,cjs}'` and the starter route is written under `app/`; otherwise it falls back to `src/`. Existing config files are never overwritten. Use `--config`, repeated `--routes`, and `--out-dir` to choose the config filename, route-file locations, and generated artifact directory during bootstrapping. When custom `--routes` globs are provided, `init` writes the config but does not create a starter route that would fall outside those globs. Add a route file later and run `generate`, or pass `starterRouteFile` through the programmatic API when a starter file should be created explicitly.

A shorter alias `cbr` is also available:

```sh
cbr generate --routes src/routes.tsx --out-dir .cookbook-router
```

## Config file

For colocated route files, add `cookbook-router.config.ts` at the project root:

```ts
import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  outDir: '.cookbook-router',
});
```

Supported config names are:

- `cookbook-router.config.ts`
- `cookbook-router.config.mts`
- `cookbook-router.config.cts`
- `cookbook-router.config.js`
- `cookbook-router.config.mjs`
- `cookbook-router.config.cjs`

When `routeFiles` is configured, `generate`, `validate`, `manifest`, and `generate --watch` can run without `--routes`. Relative `routeFiles` and `outDir` values are resolved from the config file directory. The config can be exported inline or through a local static default identifier. `routeFiles` and `outDir` may be inline static string/string-array literals or local static constants, including shorthand properties such as `{ routeFiles, outDir }`. Function calls, spreads, conditionals, template expressions, and imported values are rejected for these fields so config loading stays deterministic.

Config-level custom `pathConstraints` should be imported from a runtime-safe module when colocated `defineRoute()` files use constrained params. The generated `routes.ts` file imports that same constraints object and passes it to the generated route-tree helper, so runtime matching and href generation see the custom constraints without importing `@cookbook/router-cli` or the config file.

```ts
// src/path-constraints.ts
import { createPathConstraint } from '@cookbook/router';

export const pathConstraints = {
  slug: createPathConstraint({
    parse(paramName, value) {
      if (typeof value !== 'string') {
        throw new Error(`Parameter "${paramName}" must be a string.`);
      }
    },
    verify() {},
    toRegExp: () => '[a-z0-9-]+',
  }),
};
```

```ts
// cookbook-router.config.ts
import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './src/path-constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  outDir: '.cookbook-router',
  pathConstraints,
} as const);
```

Inline config-only constraint objects remain valid for build-time validation. `pathConstraints` can be written as shorthand (`{ pathConstraints }`) or as an explicit property (`{ pathConstraints: constraints }`) when the referenced value is a static object declaration. Prefer an imported runtime-safe module when generated route trees need those constraints at app runtime.

## Route file formats

The CLI accepts:

- `.json`
- `.js`
- `.mjs`
- `.cjs`
- `.ts`
- `.tsx`
- `.mts`
- `.cts`
- extensionless JSON files

The common app shape can be a static `defineRoutes([...])` export, a manual `defineRouteTree({ routes: [...] })` export, or colocated `defineRoute({...})` declarations.

```tsx
import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([{ id: 'home', path: '/', view: HomePage }] as const);
```

Colocated route files can export one or more `defineRoute({...})` declarations. Child routes attach to parents with an explicit `parent` ID.

```tsx
import { defineRoute } from '@cookbook/router';

export const blogRoute = defineRoute({
  id: 'blog',
  path: '/blog',
} as const);

export const articleRoute = defineRoute({
  id: 'blog.article',
  parent: 'blog',
  path: 'articles/{slug}',
  view: ArticlePage,
} as const);
```

Manual modular trees are also supported when the `routes` array is statically extractable. This is useful when you want explicit imports without glob discovery. Because `defineRouteTree()` runs when that module is imported by your app, the tree exported from that file must be self-contained; use separate exported `defineRoute()` declarations for split parent/child route files that are composed later by the generator:

```tsx
import { defineRouteTree } from '@cookbook/router';
import { blogRoute } from './blog.route';
import { articleRoute } from './article.route';

export const routes = defineRouteTree({
  routes: [blogRoute, articleRoute],
} as const);
```

The generated `.cookbook-router/routes.ts` file imports route source exports explicitly. Colocated `defineRoute()` declarations are composed with `defineRouteTree()`. Pure static route-tree exports are combined with `defineRoutes()` so existing static-tree semantics stay unchanged. The runtime router never searches the filesystem.

JSON files must provide a top-level `routes` array.

```json
{
  "routes": [{ "id": "home", "path": "/" }]
}
```

## Static metadata imports

Route metadata imports followed by the CLI must use relative or absolute file paths. This keeps extraction portable and avoids coupling the CLI to bundler-specific aliases.

```ts
// Supported for static metadata
import { paginationSearch } from './pagination-search';
import { paginationSearch } from '../filters/pagination';
import { paginationSearch } from '/absolute/project/app/filters/pagination';

// Rejected when used by static metadata
import { paginationSearch } from '@/lib/routes/filters/pagination';
import { paginationSearch } from '@app/routes/filters/pagination';
import { paginationSearch } from 'shared-route-metadata';
```

Aliases such as `@/` are still fine for runtime-only imports like route components because the extractor replaces runtime fields before following metadata dependencies.

```ts
import { OverviewPage } from '@/pages/overview/page';

export const overviewRoute = defineRoute({
  id: 'overview',
  path: '/overview',
  view: OverviewPage,
} as const);
```

## Generate

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

Writes:

```txt
.cookbook-router/routes.ts          # when generated from route source files
.cookbook-router/contracts.ts
.cookbook-router/manifest.json
.cookbook-router/register.d.ts
```

Generated files are content-aware: unchanged output is not rewritten. This avoids build-tool rebuild loops.

## Validate

```sh
cookbook-router validate --routes src/routes.tsx
```

Validates routes without writing files. It exits non-zero on errors.

## Manifest only

```sh
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
```

Writes only `manifest.json`.

## Route file limitations

The CLI expects statically extractable route declarations. Keep codegen-relevant fields inline and literal when possible: `id`, `path`, `index`, `search`, `hash`, `meta`, `children`, `layout.slots`, and `redirect`. Imported views are supported because the extractor replaces view-bearing fields with placeholders. Static data constants for route IDs, paths, hash values, and metadata are supported when they are local constants or named relative/absolute imports from another statically extractable module. Named export aliases are supported for imported static constants and reusable URL descriptors, so `const value = ...; export { value as routeValue };` remains extractable.

Generated contract files now include both parsed params and navigation params:

```ts
export interface RouteParams {
  'files.show': { path: readonly string[] };
}

export interface RouteParamsInput {
  'files.show': { path: string | readonly string[] };
}
```

`RouteParams` describes parsed router state. `RouteParamsInput` describes href/navigation input, so wildcard params can be passed as either a slash-delimited string or an array of path segments while matched route state remains stable.

Generated contracts follow URLKit static descriptor semantics. Reusable descriptors declared with `defineSearch()`, `mergeSearch()`, and `defineHash()` are supported when they are statically resolvable inline or through relative/absolute imports. Built-in parsed path constraints such as `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` generate `number` params. Built-in `uuid`, `minlength`, `maxlength`, `list`, and `regex` constraints generate `string` params. Wildcards generate `readonly string[]` parsed params and `string | readonly string[]` input params for href/navigation APIs. Custom path constraints declared through `defineRoutes(routes, { pathConstraints })` generate `string` params unless URLKit exposes typed static custom inference. See [Path routes and constraints](path-routes.md) for the complete path constraint surface.

Static constants can be used for route data:

```tsx
// route-constants.ts
export const articleRouteId = 'articles.show' as const;
export const articlePath = '/articles/{slug}' as const;
export const articleHashValues = ['comments', 'share'] as const;
export const articleMeta = { title: 'Article' } as const;
```

```tsx
// article.route.tsx
import { defineRoute } from '@cookbook/router';
import { articleHashValues, articleMeta, articlePath, articleRouteId } from './route-constants';

export const articleRoute = defineRoute({
  id: articleRouteId,
  path: articlePath,
  meta: articleMeta,
  hash: { type: 'enum', values: articleHashValues, optional: true },
} as const);
```

Only data literals are supported for these constants: strings, numbers, booleans, `null`, `undefined`, arrays, and objects. Constants that call runtime functions, construct classes, define functions, or rely on browser globals are intentionally ignored so generation fails instead of executing application code.

Use static URL descriptors in CLI-consumed route files:

```tsx
export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{price:int}',
    search: {
      page: { type: 'int', default: 1 },
      tags: { type: 'string', many: true },
      publishedOn: {
        type: 'date',
        format: 'dd-MM-yyyy',
        optional: true,
      },
      startsAt: {
        type: 'date-time',
        format: 'dd-MM-yyyy HH:mm:ss',
        optional: true,
      },
    },
    hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
    url: { arrayFormat: 'comma' },
  },
] as const);
```

Do not use URLKit runtime builders such as `int().default(1)` or `date({ format: 'dd-MM-yyyy' })` in static route files unless the extractor explicitly supports them. Use static descriptors such as `{ type: 'int', default: 1 }` and `{ type: 'date', format: 'dd-MM-yyyy', optional: true }` instead. Route-level `url` options are included in `manifest.json` so manifest-based runtimes can preserve array-format and default-serialization behavior.

Router route descriptors support date and date-time format strings as plain static data. URLKit treats static date/date-time values as UTC: date-only formats use UTC calendar fields, date-time formats are UTC instants, and custom static format strings serialize from UTC fields. They do not support custom runtime parse/serialize codec functions in route definitions because the CLI must be able to analyze route files without executing arbitrary URLKit builders.

If generation fails on a complex route file, simplify the route declaration or move codegen-relevant values into supported static constants, `defineRoute()`, `defineSearch()`, `mergeSearch()`, or `defineHash()` declarations before rerunning `generate`. Generated artifacts are written only after the collected route tree validates, so invalid static trees do not leave partially updated output. Repeated generations skip unchanged file writes and report when artifacts are already up to date. `validate` uses the same static-tree-vs-modular distinction as generation: static `defineRoutes()` files keep static nested-tree semantics, while files that use `parent`/`order` composition are resolved through `defineRouteTree()`. Route-file `pathOptions` and custom path constraint names are checked for conflicts before validation continues.

## Watch mode

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
```

With a config file:

```sh
cbr generate --watch
```

Generates all files once, keeps the process alive, and regenerates them when route files or config files change. Rapid file-system events are debounced before regeneration. Watch mode observes glob roots, so newly created files matching an existing `routeFiles` glob can trigger regeneration. When the config file changes, watch mode reloads the effective `routeFiles` value, closes stale watchers, and watches the new roots. Failed regenerations keep the previous valid generated files because validation completes before writes occur.

## Builder plugin options and config discovery

All builder plugins use the same generator runner from `@cookbook/router-cli` and accept the same core options:

```ts
{
  cwd?: string;
  configFile?: string;
  routeFiles?: string | readonly string[];
  outDir?: string;
}
```

When `configFile` is omitted, each plugin uses the shared Cookbook Router config discovery list:

- `cookbook-router.config.ts`
- `cookbook-router.config.mts`
- `cookbook-router.config.cts`
- `cookbook-router.config.js`
- `cookbook-router.config.mjs`
- `cookbook-router.config.cjs`

`routeFiles` and `outDir` are usually better kept in the config file. Pass them to the plugin when a build target needs to override config defaults.

## Vite plugin

Install and register `@cookbook/router-vite-plugin` to run the same generator engine inside Vite:

```ts
import { defineConfig } from 'vite';
import { cookbookRouterVitePlugin } from '@cookbook/router-vite-plugin';

export default defineConfig({
  plugins: [cookbookRouterVitePlugin()],
});
```

The plugin reads `cookbook-router.config.ts`, generates physical files before dev/build compilation, watches config and route glob roots during dev, ignores the generated output directory, and sends a full reload after successful regeneration.

## Webpack plugin

Install and register `@cookbook/router-webpack-plugin` to run the same generator engine inside Webpack:

```ts
import { CookbookRouterPlugin } from '@cookbook/router-webpack-plugin';

export default {
  plugins: [new CookbookRouterPlugin()],
};
```

The plugin reads `cookbook-router.config.ts`, generates physical files before normal and watch compilations, adds the config file and route glob roots as watch dependencies, and ignores the generated output directory to avoid rebuild loops.

## Rspack plugin

Install and register `@cookbook/router-rspack-plugin` for an explicit Rspack package/import path:

```ts
import { CookbookRouterRspackPlugin } from '@cookbook/router-rspack-plugin';

export default {
  plugins: [new CookbookRouterRspackPlugin()],
};
```

The Rspack package exposes an explicit `@rspack/core` plugin class and preserves the same watch/recovery behavior: generation runs before normal and watch compilations, config files and route glob roots are compiler dependencies, and failed watch regenerations keep previous valid artifacts.

## Rollup and Rolldown plugin

Install and register `@cookbook/router-rollup-plugin` to run generation from Rollup `buildStart`:

```ts
import { cookbookRouterRollupPlugin } from '@cookbook/router-rollup-plugin';

export default {
  input: 'src/main.ts',
  plugins: [cookbookRouterRollupPlugin()],
};
```

The plugin generates physical files before Rollup resolves application modules and registers the config file plus route glob roots with `this.addWatchFile()`. One-off builds fail on generation errors. Watch builds log generation errors so the watcher can recover on the next valid rebuild.

## esbuild plugin

Install and register `@cookbook/router-esbuild-plugin` to run generation from esbuild `onStart`:

```ts
import { build } from 'esbuild';
import { cookbookRouterEsbuildPlugin } from '@cookbook/router-esbuild-plugin';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  plugins: [cookbookRouterEsbuildPlugin()],
});
```

The plugin generates physical files before esbuild compiles application modules and returns generation failures as esbuild errors. esbuild does not expose the same arbitrary route-glob watch dependency API as Vite, Webpack/Rspack, or Rollup, so use `cbr generate --watch` when long-running route-file watching is needed outside esbuild's module graph.

## Bun plugin

Install and register `@cookbook/router-bun-plugin` to run generation from Bun `PluginBuilder.onStart`:

```ts
import { cookbookRouterBunPlugin } from '@cookbook/router-bun-plugin';

await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  plugins: [cookbookRouterBunPlugin()],
});
```

The plugin generates physical files before Bun bundles application modules and throws generation failures from `onStart`, which fails the Bun build.

## Programmatic usage

```ts
import { generateCommand, validateCommand, watchCommand } from '@cookbook/router-cli';

await validateCommand({ routeFiles: ['src/routes.tsx'] });
await generateCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });

const watcher = watchCommand({
  routeFiles: ['src/routes.tsx'],
  outDir: '.cookbook-router',
  onChange(result) {
    if (!result.ok) {
      console.error(result.errors.join('\n'));
    }
  },
});

await watcher.initial;

// Later, when your integration is shutting down:
watcher.close();
```

You can also pass routes directly in programmatic code:

```ts
await generateCommand({ routes, outDir: '.cookbook-router' });
```

## Programmatic generation helpers

Use the generation helpers when embedding Cookbook Router codegen inside another build tool.

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

await generateRouterArtifacts({
  configFile: 'cookbook-router.config.ts',
});
```

Signatures:

```ts
function generateContracts(routes: readonly RouteDefinition[]): string;
function generateRegister(): string;
function generateManifest(routes: readonly RouteDefinition[]): RouteManifest;
function serializeManifest(manifest: RouteManifest): string;
function generateRouterArtifacts(options: GenerateRouterArtifactsOptions): Promise<CommandResult>;

interface RouteManifest {
  readonly routes: readonly ManifestRoute[];
}
```

See the [CLI API reference](api.md#programmatic-command-apis) for command APIs and [contract registration](api.md#contract-registration) for generated type registration.

## CLI runner helpers

`runCli()` and `shouldRunCli()` are public for tests and custom executable wrappers.

```ts
import { runCli, shouldRunCli } from '@cookbook/router-cli';

if (shouldRunCli()) {
  process.exitCode = await runCli(process.argv.slice(2));
}
```

Signatures:

```ts
interface CliRunnerOptions {
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly version?: string;
}

function runCli(argv: readonly string[], runnerOptions?: CliRunnerOptions): Promise<number>;
function shouldRunCli(moduleUrl?: string, argv?: readonly string[]): boolean;
```

## Generated output

### `routes.ts`

Generated when using route source files. It imports discovered route declarations, composes colocated routes with `defineRouteTree()`, combines multiple static tree exports with `defineRoutes()`, and directly re-exports a single static tree when doing so preserves source-level `defineRoutes()` / `defineRouteTree()` options.

### `contracts.ts`

Contains:

- `RouteParams`
- `RouteSearch`
- `RouteSearchInput`
- `RouteHash`
- `RouteMeta`
- `RoutePaths`
- `RouteOutletContext`
- `RouterContracts`

### `register.d.ts`

Registers generated contracts through `@cookbook/router` and `@cookbook/router-react` module augmentation.

### `manifest.json`

Contains runtime route IDs, paths, and route-level URL options such as `arrayFormat`, `defaults`, `invalidSearch`, `invalidHash`, and `unknownSearch` when configured.

## Static extraction rules

The CLI statically extracts the array passed to `defineRoutes([...])`, a static `routes = [...]` array, self-contained manual `defineRouteTree({ routes: [...] })` exports, exported `defineRoute({...})` declarations, named export aliases such as `export { appRoutes as routes }`, reusable URL descriptor helpers, and supported static data constants. Import resolution is driven by identifiers referenced from route metadata; imports used only by runtime fields such as `view` or `layout.view` are ignored. Named relative and absolute file imports are supported for static metadata. Path aliases and bare package imports are rejected for static metadata. View references are sanitized to placeholder functions during extraction, so aliases remain valid for runtime-only route components.

Keep route files codegen-friendly:

- declare static route trees with `defineRoutes([...])` or colocated routes with `defineRoute({...})`
- avoid computed IDs and computed paths
- avoid route arrays assembled through runtime loops
- keep route config serializable where possible
- use static URLKit-compatible `search`, `hash`, and `url` descriptors
- keep reusable route IDs, paths, hash values, and metadata in data-only static constants when extracting them from route declarations
- use named exports or named export aliases for static constants and reusable URL descriptors that are imported by route files
- register custom path constraints in `cookbook-router.config.ts` when generated route modules need to preserve them at runtime; single static route-tree files may also keep source-level route options
- define each custom path constraint name once; duplicate names across config and route source files fail instead of being silently overwritten
- keep `pathOptions` centralized or identical everywhere; conflicting `pathOptions` from config and route source files fail before generated files are written
- keep complex runtime logic outside route declarations

## Safety checks

The CLI validates:

- route file paths
- generated output paths
- route tree validity
- duplicate IDs
- duplicate full paths
- invalid path patterns
- unsupported URLKit runtime builders in static route files
- invalid slot definitions
- malformed redirects
- invalid configured intercept targets

It also refuses output layouts that would clobber route files.

## Common workflows

### App development

```json
{
  "scripts": {
    "routes:generate": "cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router",
    "routes:watch": "cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch",
    "routes:validate": "cookbook-router validate --routes src/routes.tsx"
  }
}
```

### CI

```sh
pnpm routes:generate
pnpm routes:validate
pnpm typecheck
pnpm test
pnpm build
```

## Troubleshooting

### `Route file must export routes`

Make sure the file contains `defineRoutes([...])`, exported `defineRoute({...})` declarations, or a static `routes = [...]` array.

### Generated contracts do not update

Run `generate` manually once to check diagnostics, then use either `watch` or `generate --watch` during development. Watch mode prints the initial generation result and each later regeneration result.

### View imports fail during generation

The CLI does not need to execute views, but the route declaration still needs to be statically extractable. Keep view values as identifiers directly in the route array.

### TypeScript does not see generated types

Include the generated contract and registration files in `tsconfig.json`.

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

Once `.cookbook-router/register.d.ts` is included in your TypeScript program, it augments `@cookbook/router` and `@cookbook/router-react` with the generated route contracts from `.cookbook-router/contracts.ts`.

Router APIs can then infer valid route IDs, exact route paths, path params, search values, hash values, and route metadata from the generated public types. Path params follow the generated constraint contract: numeric built-in constraints such as `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` become `number`; unconstrained params, string-shaped constraints such as `uuid`, `regex`, `list`, `minlength`, `maxlength`, and custom constraints are exposed as `string` unless combined with a numeric built-in constraint. Wildcards such as `{*path}` are parsed as `readonly string[]`; generated route URL input accepts `string | readonly string[]` for wildcard params.

## Generated route-module preload

Generated `.cookbook-router/routes.ts` attaches an internal module preloader to wrapped route exports. This lets `router.preload()`, `router.preloadHref()`, and React link prefetch warm generated/file-based route modules without requiring every route file to define a custom `preload` callback.

For route declaration files:

```ts
export const route = defineRoute({
  id: 'users',
  path: '/users',
  view: UsersPage,
});
```

The generated runtime route is wrapped with an internal preloader equivalent to:

```ts
modulePreload: () => import('../routes/users.route');
```

For static/manual route declarations that are not split by generated route modules, use `lazyRouteView` to make a lazy view preloadable:

```tsx
const UsersPage = lazyRouteView(() => import('./users-page'));
```

Route-level `preload` remains optional and should be reserved for application-owned warming such as query caches, images, permissions, or configuration.
