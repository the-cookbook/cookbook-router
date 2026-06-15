# @cookbook/router-rspack-plugin

Rspack plugin for generating Cookbook Router physical route artifacts from `cookbook-router.config.ts`.

The package exposes an explicit Rspack plugin class typed against `@rspack/core`. It shares the same generation runner and compiler-hook behavior as the Webpack integration, while keeping the Rspack install path and import name clear.

## Install

```sh
pnpm add -D @cookbook/router-rspack-plugin @cookbook/router-cli
```

## Usage

```ts
// rspack.config.ts
import { CookbookRouterRspackPlugin } from '@cookbook/router-rspack-plugin';

export default {
  plugins: [new CookbookRouterRspackPlugin()],
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
- fails one-off builds when route generation fails
- keeps watch mode recoverable when generation fails

## Options

```ts
new CookbookRouterRspackPlugin({
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

Route files must stay statically analyzable for CLI/generator contract extraction. Use `defineRoute()`, static URL descriptors, `defineSearch()`, `mergeSearch()`, and `defineHash()`.
