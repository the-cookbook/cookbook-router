# @cookbook/router-rollup-plugin

Rollup/Rolldown plugin for generating Cookbook Router physical route artifacts from `cookbook-router.config.ts`.

The plugin runs the same generator engine as `cbr generate`. It writes files to `.cookbook-router/` before bundling so application imports and TypeScript module augmentation are backed by real files.

## Install

```sh
pnpm add -D @cookbook/router-rollup-plugin @cookbook/router-cli
```

## Usage

```ts
// rollup.config.ts
import { cookbookRouterRollupPlugin } from '@cookbook/router-rollup-plugin';

export default {
  input: 'src/main.ts',
  plugins: [cookbookRouterRollupPlugin()],
};
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

- loads `cookbook-router.config.ts` from the Rollup working directory
- generates `.cookbook-router/routes.ts`, `contracts.ts`, `register.d.ts`, and `manifest.json`
- runs during `buildStart`, before Rollup resolves application modules
- registers the config file and route glob roots with `this.addWatchFile()`
- fails one-off builds when generation fails
- logs generation failures in watch mode so the watcher can recover on the next valid rebuild

## Options

```ts
cookbookRouterRollupPlugin({
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
