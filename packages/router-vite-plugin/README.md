# @cookbook/router-vite-plugin

Vite plugin for generating Cookbook Router physical route artifacts from `cookbook-router.config.ts`.

The plugin runs the same generator engine as `cbr generate`. It writes files to `.cookbook-router/` so TypeScript, editors, CI, and application code all read the same generated route tree and contracts.

## Install

```sh
pnpm add -D @cookbook/router-vite-plugin @cookbook/router-cli
```

## Usage

```ts
// vite.config.ts
import { cookbookRouterVitePlugin } from '@cookbook/router-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [cookbookRouterVitePlugin()],
});
```

```ts
// cookbook-router.config.ts
import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'app/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
} as const);
```

```ts
// app/router.ts
import { createRouter } from '@cookbook/router';
import { routes } from '../.cookbook-router/routes';

export const router = createRouter({ routes });
```

## What it does

- loads `cookbook-router.config.ts` from the Vite root
- generates `.cookbook-router/routes.ts`, `contracts.ts`, `register.d.ts`, and `manifest.json`
- runs before dev/build compilation
- watches the router config and route-file glob roots during dev
- reacts to route file creation, modification, and deletion
- refreshes watched roots when `routeFiles`, `configFile`, or `outDir` change
- watches config-file candidates when the config is temporarily missing or invalid
- ignores `.cookbook-router/` to avoid rebuild loops
- writes only when generated content changes
- sends a full reload after successful dev regeneration
- reports dev-generation errors without overwriting the previous valid artifacts
- regenerates and reloads after the next valid change fixes the error
- fails production builds when generation fails

## Watch and recovery behavior

In dev mode, the plugin is intentionally recoverable:

1. A route/config change schedules generation after `debounceMs`.
2. The shared generator validates the full route graph before writing files.
3. If generation fails, existing generated artifacts are left untouched and the error is logged.
4. The watcher stays active for the config file and route glob roots.
5. When the invalid route/config is fixed, generation starts from the current file system state and writes fresh artifacts.

This means adding, deleting, or fixing files under a configured glob does not require restarting the Vite dev server.

## Options

```ts
cookbookRouterVitePlugin({
  configFile: 'cookbook-router.config.ts',
  routeFiles: 'app/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
  debounceMs: 50,
});
```

| Option       | Purpose                                                                        |
| ------------ | ------------------------------------------------------------------------------ |
| `configFile` | Explicit config file. Defaults to config discovery from the Vite root.         |
| `routeFiles` | Explicit route source file/glob override. Usually keep this in config instead. |
| `outDir`     | Generated artifact directory override. Usually keep this in config instead.    |
| `debounceMs` | Debounce interval for dev-server regeneration.                                 |

## Notes

Generated files are physical files by design. Do not import route files through virtual modules unless a future integration explicitly documents that behavior.

Route files must stay statically analyzable for CLI/generator contract extraction. Use `defineRoute()`, static URL descriptors, `defineSearch()`, `mergeSearch()`, and `defineHash()`.
