# Bundler plugins

Cookbook Router provides build-tool plugins that run the same physical route-artifact generator as `cbr generate`. Each plugin reads `cookbook-router.config.*`, validates the route graph, and writes generated files before application modules are compiled.

Generated artifacts are physical files. TypeScript, editors, CI, server builds, and browser builds therefore consume the same route tree and contracts without relying on a virtual module.

## Table of contents

- [Choose a plugin](#choose-a-plugin)
- [Shared behavior](#shared-behavior)
- [Shared options](#shared-options)
- [Vite](#vite)
- [Webpack](#webpack)
- [Rspack](#rspack)
- [Rollup and Rolldown](#rollup-and-rolldown)
- [esbuild](#esbuild)
- [Bun](#bun)
- [Watch and recovery behavior](#watch-and-recovery-behavior)
- [Generated files](#generated-files)
- [Route-source requirements](#route-source-requirements)
- [Troubleshooting](#troubleshooting)
- [Related docs](#related-docs)

## Choose a plugin

| Builder           | Package                           | Public API                         | Generation hook                         | Route-root watch support             | Failure behavior                                                |
| ----------------- | --------------------------------- | ---------------------------------- | --------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| Vite              | `@cookbook/router-vite-plugin`    | `cookbookRouterVitePlugin()`       | `buildStart` and dev-server setup       | Yes                                  | Dev logs the error and keeps watching; production build fails.  |
| Webpack           | `@cookbook/router-webpack-plugin` | `new CookbookRouterPlugin()`       | `beforeRun`, `watchRun`, `afterCompile` | Yes                                  | One-off builds fail; watch mode logs the error and can recover. |
| Rspack            | `@cookbook/router-rspack-plugin`  | `new CookbookRouterRspackPlugin()` | `beforeRun`, `watchRun`, `afterCompile` | Yes                                  | One-off builds fail; watch mode logs the error and can recover. |
| Rollup / Rolldown | `@cookbook/router-rollup-plugin`  | `cookbookRouterRollupPlugin()`     | `buildStart`                            | Yes, through `addWatchFile()`        | One-off builds fail; watch mode warns and can recover.          |
| esbuild           | `@cookbook/router-esbuild-plugin` | `cookbookRouterEsbuildPlugin()`    | `onStart`                               | No arbitrary route-glob registration | Generation failures are returned as esbuild errors.             |
| Bun               | `@cookbook/router-bun-plugin`     | `cookbookRouterBunPlugin()`        | `PluginBuilder.onStart`                 | No explicit route-root registration  | Generation failures throw and fail the build.                   |

Use `cbr generate --watch` when the selected builder cannot watch route-file glob roots itself.

## Shared behavior

All plugins use the generation runner exported by `@cookbook/router-cli`.

The shared flow is:

1. Resolve explicit plugin options.
2. Discover and load `cookbook-router.config.*` when `configFile` is not provided.
3. Resolve route files and the output directory.
4. Load or statically extract route declarations.
5. Validate the complete route graph.
6. Generate all artifacts in memory.
7. Write only files whose content changed.

If validation or generation fails, the generator does not partially replace the existing output. Watch-capable integrations retain the previous valid artifacts so the next valid file-system change can recover without restarting the builder.

Supported config filenames are:

- `cookbook-router.config.ts`
- `cookbook-router.config.mts`
- `cookbook-router.config.cts`
- `cookbook-router.config.js`
- `cookbook-router.config.mjs`
- `cookbook-router.config.cjs`

A typical config is:

```ts
import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
});
```

## Shared options

Webpack, Rspack, Rollup, esbuild, and Bun use the shared builder options:

```ts
interface CookbookRouterBuilderPluginOptions {
  readonly cwd?: string;
  readonly configFile?: string;
  readonly routeFiles?: string | readonly string[];
  readonly outDir?: string;
  readonly fs?: CliFileSystem;
}
```

| Option       | Purpose                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cwd`        | Project root used for config discovery and relative route/output paths. Defaults to the builder context or current working directory, depending on the integration. |
| `configFile` | Explicit router config path. When omitted, the shared config discovery list is used.                                                                                |
| `routeFiles` | Route file or glob override. Prefer the config file unless a specific build target needs a different input.                                                         |
| `outDir`     | Generated output directory override. Defaults to the config value or `.cookbook-router`.                                                                            |
| `fs`         | File-system adapter for tests or non-standard runtimes. Normal applications should omit it.                                                                         |

Vite derives its project root from the resolved Vite config and exposes this option shape:

```ts
interface CookbookRouterVitePluginOptions {
  readonly configFile?: string;
  readonly routeFiles?: string | readonly string[];
  readonly outDir?: string;
  readonly debounceMs?: number;
  readonly fs?: CliFileSystem;
}
```

`debounceMs` defaults to `50` and controls dev-server regeneration after file-system events.

## Vite

Install:

```sh
pnpm add -D @cookbook/router-vite-plugin @cookbook/router-cli
```

Configure:

```ts
// vite.config.ts
import { cookbookRouterVitePlugin } from '@cookbook/router-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cookbookRouterVitePlugin({
      configFile: 'cookbook-router.config.ts',
      debounceMs: 50,
    }),
  ],
});
```

The Vite plugin:

- runs before dev and production compilation
- uses the resolved Vite root for config discovery and relative paths
- watches the active config file and route-file glob roots
- watches config candidates while the config is missing or temporarily invalid
- reacts to route creation, modification, deletion, and config changes
- recalculates watched roots when `routeFiles`, `configFile`, or `outDir` changes
- ignores generated output to prevent rebuild loops
- sends a full reload after successful regeneration
- leaves previous valid artifacts untouched after a dev-generation error
- throws when generation fails during a production build

The Vite package exports the named `cookbookRouterVitePlugin` function and `CookbookRouterVitePluginOptions` type.

## Webpack

Install:

```sh
pnpm add -D @cookbook/router-webpack-plugin @cookbook/router-cli
```

Configure:

```ts
// webpack.config.ts
import { CookbookRouterPlugin } from '@cookbook/router-webpack-plugin';

export default {
  plugins: [
    new CookbookRouterPlugin({
      configFile: 'cookbook-router.config.ts',
      cwd: process.cwd(),
    }),
  ],
};
```

The Webpack plugin:

- runs generation before normal and watch compilations
- derives `cwd` from the compiler context unless explicitly provided
- adds config files as file or missing dependencies
- adds route glob roots as context dependencies
- recalculates dependencies after config changes
- excludes the generated output directory from compiler watch dependencies
- extends existing `watchOptions.ignored` instead of replacing it
- fails one-off builds when generation fails
- logs watch-generation errors while preserving previous valid output
- supports multiple compiler instances; unchanged generated files are not rewritten

The package exports `CookbookRouterPlugin`, `CookbookRouterPluginOptions`, and the class as the default export.

## Rspack

Install:

```sh
pnpm add -D @cookbook/router-rspack-plugin @cookbook/router-cli
```

Configure:

```ts
// rspack.config.ts
import { CookbookRouterRspackPlugin } from '@cookbook/router-rspack-plugin';

export default {
  plugins: [
    new CookbookRouterRspackPlugin({
      configFile: 'cookbook-router.config.ts',
      cwd: process.cwd(),
    }),
  ],
};
```

Rspack uses the same compiler-hook integration and recovery model as Webpack:

- generation before normal and watch compilations
- config-file, missing-file, and route-root dependencies
- output-directory watch exclusion
- one-off build failures
- recoverable watch failures

The package exports `CookbookRouterRspackPlugin`, `CookbookRouterRspackPluginOptions`, an alias named `CookbookRouterPlugin`, and the Rspack class as the default export.

## Rollup and Rolldown

Install:

```sh
pnpm add -D @cookbook/router-rollup-plugin @cookbook/router-cli
```

Configure:

```ts
// rollup.config.ts
import { cookbookRouterRollupPlugin } from '@cookbook/router-rollup-plugin';

export default {
  input: 'src/main.ts',
  plugins: [cookbookRouterRollupPlugin()],
};
```

The plugin runs generation from `buildStart` and registers every resolved config/route watch path with `this.addWatchFile()`.

- Successful builds continue normally.
- A one-off build reports the generation error and fails.
- Watch mode reports the error as a warning and remains active for the next valid change.

The package exports `cookbookRouterRollupPlugin`, `CookbookRouterRollupPluginOptions`, and the function as the default export. It can be used by Rolldown where Rollup-compatible plugins are accepted.

## esbuild

Install:

```sh
pnpm add -D @cookbook/router-esbuild-plugin @cookbook/router-cli
```

Configure:

```ts
import { build } from 'esbuild';
import { cookbookRouterEsbuildPlugin } from '@cookbook/router-esbuild-plugin';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  plugins: [cookbookRouterEsbuildPlugin()],
});
```

The plugin runs generation from `onStart` before esbuild compiles application modules. Failures are returned through esbuild's structured `errors` result.

esbuild plugins cannot register arbitrary route-glob roots with the watcher in the same way as Vite, Webpack, Rspack, or Rollup. For long-running route-file watching outside esbuild's module graph, run:

```sh
cbr generate --watch
```

The package exports `cookbookRouterEsbuildPlugin`, `CookbookRouterEsbuildPluginOptions`, and the function as the default export.

## Bun

Install:

```sh
bun add -d @cookbook/router-bun-plugin @cookbook/router-cli
```

Configure:

```ts
import { cookbookRouterBunPlugin } from '@cookbook/router-bun-plugin';

await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  plugins: [cookbookRouterBunPlugin()],
});
```

The plugin runs generation from `PluginBuilder.onStart`. A generation error is formatted with the standard `[cookbook-router]` prefix and thrown, which fails the Bun build.

The package exports `cookbookRouterBunPlugin`, `CookbookRouterBunPluginOptions`, and the function as the default export.

## Watch and recovery behavior

| Integration       |         Watches config changes |     Watches route creation/deletion | Preserves prior valid output on watch errors |                           Automatically retries after a valid change |
| ----------------- | -----------------------------: | ----------------------------------: | -------------------------------------------: | -------------------------------------------------------------------: |
| Vite              |                            Yes |                                 Yes |                                          Yes |                                                                  Yes |
| Webpack           |                            Yes |                                 Yes |                                          Yes |                                                                  Yes |
| Rspack            |                            Yes |                                 Yes |                                          Yes |                                                                  Yes |
| Rollup / Rolldown |                            Yes | Yes, through registered watch roots |                                          Yes |                                                                  Yes |
| esbuild           | Builder/module-graph dependent |             No arbitrary glob roots |                         Generation is atomic |              Use `cbr generate --watch` for full route-root watching |
| Bun               |              Builder dependent | No explicit route-root registration |                         Generation is atomic | Use `cbr generate --watch` when full route-root watching is required |

Watch-capable plugins recompute their watch state from the current config. Moving `routeFiles` to another source root therefore removes stale roots and adds the new roots without requiring a process restart.

## Generated files

The default output directory is `.cookbook-router/`.

Depending on the route input, generation writes:

- `routes.ts` — imports and composes discovered route declarations
- `contracts.ts` — route IDs, params, search, hash, metadata, paths, outlet context, and combined contract types
- `register.d.ts` — module augmentation for `@cookbook/router` and `@cookbook/router-react`
- `manifest.json` — route IDs, paths, and serializable route URL options

Application code imports the generated route tree as a normal file:

```ts
import { createRouter } from '@cookbook/router';
import { routes } from '../.cookbook-router/routes';

export const router = createRouter({ routes });
```

Do not watch or import the generated directory through a second virtual-module layer. The plugins deliberately use physical artifacts so all tools observe the same files.

## Route-source requirements

Bundler plugins use the CLI's static extraction rules. Route declarations that affect generated contracts must remain statically analyzable.

Prefer:

- `defineRoute()` and `defineRoutes()` declarations
- static route IDs and paths
- `defineSearch()`, `mergeSearch()`, and `defineHash()`
- serializable search, hash, URL, metadata, redirect, slot, and intercept declarations
- relative or absolute imports for data used by static route metadata

Runtime-only values such as route views may use normal application imports because the extractor replaces view-bearing fields with placeholders before evaluating route metadata.

Avoid computed route IDs, runtime loops that assemble route arrays, unsupported runtime URLKit builders, and path aliases or bare package imports for values that must be statically evaluated.

## Troubleshooting

### Generation loops continuously

Ensure the configured `outDir` is not inside a route-file glob. The Vite, Webpack, and Rspack integrations exclude the generated output, but overlapping source/output patterns remain a configuration error.

### A new or deleted route is not detected

- Vite, Webpack, Rspack, and Rollup should watch route-root paths derived from the configured globs.
- Verify that the file is inside an active `routeFiles` pattern.
- Restart after changing builder configuration if the builder itself does not refresh plugin configuration.
- For esbuild or Bun, use `cbr generate --watch` when the builder does not expose route-root watch registration.

### The plugin reports an error but generated files did not change

That is intentional. Generation validates the complete result before writing, so previous valid artifacts remain available during recoverable watch failures.

### The config file does not exist yet

Vite, Webpack, and Rspack track config candidates or missing dependencies so creating a supported config file can trigger recovery. Explicitly setting `configFile` is useful in non-standard layouts.

### CI and production builds

Generation failures should fail one-off builds. Run route validation explicitly in CI when you want a dedicated validation stage:

```sh
cbr validate
```

## Related docs

- [Code generation](codegen.md)
- [Contracts](contracts.md)
- [Routing](routing.md)
- [Testing](testing.md)
- [Troubleshooting](troubleshooting.md)
- [CLI package guide](../packages/router-cli/README.md)
