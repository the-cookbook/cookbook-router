# @cookbook/router-webpack-plugin

Webpack plugin for generating Cookbook Router physical route artifacts from `cookbook-router.config.ts`.

The plugin wraps the same shared generator engine used by `cbr generate` and the Vite plugin. It writes `.cookbook-router/` files before compilation so application imports and TypeScript module augmentation are backed by real files.

## Install

```sh
pnpm add -D @cookbook/router-webpack-plugin @cookbook/router-cli
```

## Usage

```ts
// webpack.config.ts
import { CookbookRouterPlugin } from '@cookbook/router-webpack-plugin';

export default {
  plugins: [new CookbookRouterPlugin()],
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

```ts
// src/router.ts
import { createRouter } from '@cookbook/router';
import { routes } from '../.cookbook-router/routes';

export const router = createRouter({ routes });
```

## What it does

- loads `cookbook-router.config.ts` from the compiler context
- generates `.cookbook-router/routes.ts`, `contracts.ts`, `register.d.ts`, and `manifest.json`
- runs before normal and watch compilations
- adds the config file and route glob roots as compiler dependencies
- adds missing config-file candidates as missing dependencies when the config does not exist yet
- adds route glob roots as context dependencies so created/deleted route files trigger watch rebuilds
- recomputes dependencies every compilation, so config changes that move `routeFiles` to a new root are tracked
- adds `.cookbook-router/` to ignored watch paths
- preserves existing `watchOptions.ignored`
- fails one-off builds when route generation fails
- keeps watch mode recoverable when generation fails

## Watch and recovery behavior

In watch mode, generation failures are logged but not thrown from `watchRun`. The previous valid generated files stay on disk because the shared generator validates before writing. Webpack continues watching the config file and route glob roots, so the next valid change can regenerate from the current file system state without restarting the dev server.

This covers route file creation, modification, deletion, temporary invalid route graphs, and config changes that move the route-file glob root.

## Options

```ts
new CookbookRouterPlugin({
  configFile: 'cookbook-router.config.ts',
  routeFiles: 'src/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
  cwd: process.cwd(),
});
```

| Option       | Purpose                                                                        |
| ------------ | ------------------------------------------------------------------------------ |
| `configFile` | Explicit config file. Defaults to config discovery from the compiler context.  |
| `routeFiles` | Explicit route source file/glob override. Usually keep this in config instead. |
| `outDir`     | Generated artifact directory override. Usually keep this in config instead.    |
| `cwd`        | Project root for config discovery and relative route files.                    |

## Multiple compilers

Client/server compiler setups can call the plugin more than once. The generator writes content-aware files, so unchanged artifacts are not rewritten and rebuild loops are avoided.

Route files must stay statically analyzable for CLI/generator contract extraction. Use `defineRoute()`, static URL descriptors, `defineSearch()`, `mergeSearch()`, and `defineHash()`.
