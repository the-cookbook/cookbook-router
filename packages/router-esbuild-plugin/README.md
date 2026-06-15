# @cookbook/router-esbuild-plugin

esbuild plugin for generating Cookbook Router physical route artifacts from `cookbook-router.config.ts`.

The plugin runs the same generator engine as `cbr generate`. It writes files to `.cookbook-router/` from esbuild `onStart`, before application modules are compiled.

## Install

```sh
pnpm add -D @cookbook/router-esbuild-plugin @cookbook/router-cli
```

## Usage

```ts
import { build } from 'esbuild';
import { cookbookRouterEsbuildPlugin } from '@cookbook/router-esbuild-plugin';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  plugins: [cookbookRouterEsbuildPlugin()],
});
```

```ts
// cookbook-router.config.ts
import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
} as const);
```

## What it does

- loads `cookbook-router.config.ts` from `cwd`
- generates `.cookbook-router/routes.ts`, `contracts.ts`, `register.d.ts`, and `manifest.json`
- runs from esbuild `onStart`
- returns generation failures as esbuild errors

esbuild plugins cannot add arbitrary route glob roots to the esbuild watcher the way Webpack/Rspack, Vite, and Rollup can. Use this plugin for build-time generation. For long-running route-file watching outside esbuild's module graph, use `cbr generate --watch` or a bundler plugin with route-root watch support.

## Options

```ts
cookbookRouterEsbuildPlugin({
  configFile: 'cookbook-router.config.ts',
  routeFiles: 'src/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
  cwd: process.cwd(),
});
```

| Option       | Purpose                                                                        |
| ------------ | ------------------------------------------------------------------------------ |
| `configFile` | Explicit config file. Defaults to config discovery from `cwd`.                 |
| `routeFiles` | Explicit route source file/glob override. Usually keep this in config instead. |
| `outDir`     | Generated artifact directory override. Usually keep this in config instead.    |
| `cwd`        | Project root for config discovery and relative route files.                    |

Route files must stay statically analyzable for CLI/generator contract extraction. Use `defineRoute()`, static URL descriptors, `defineSearch()`, `mergeSearch()`, and `defineHash()`.
