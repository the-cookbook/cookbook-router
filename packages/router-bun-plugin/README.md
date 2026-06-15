# @cookbook/router-bun-plugin

Bun bundler plugin for generating Cookbook Router physical route artifacts from `cookbook-router.config.ts`.

The plugin runs the same generator engine as `cbr generate`. It writes files to `.cookbook-router/` from Bun `onStart`, before application modules are bundled.

## Install

```sh
bun add -d @cookbook/router-bun-plugin @cookbook/router-cli
```

## Usage

```ts
import { cookbookRouterBunPlugin } from '@cookbook/router-bun-plugin';

await Bun.build({
  entrypoints: ['src/main.ts'],
  outdir: 'dist',
  plugins: [cookbookRouterBunPlugin()],
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
- runs from Bun `PluginBuilder.onStart`
- throws generation failures from `onStart`, which fails the Bun build

## Options

```ts
cookbookRouterBunPlugin({
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
