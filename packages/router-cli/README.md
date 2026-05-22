# @cookbook/router-cli

Developer tooling for Cookbook Router route contracts and manifests.

## Table of contents

- [Install](#install)
- [Binaries](#binaries)
- [Commands](#commands)
- [Route files](#route-files)
- [Generated files](#generated-files)
- [Programmatic API](#programmatic-api)
- [CI usage](#ci-usage)
- [Troubleshooting](#troubleshooting)
- [Related docs](#related-docs)

## Install

```sh
pnpm add -D @cookbook/router-cli
```

The CLI depends on `@cookbook/router`.

## Binaries

The package publishes two binaries:

```sh
cookbook-router --help
cbr --help
```

`cbr` is a shorthand alias for `cookbook-router`.

## Commands

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router watch --routes src/routes.tsx --out-dir .cookbook-router
```

| Command    | Purpose                                                     |
| ---------- | ----------------------------------------------------------- |
| `generate` | Write `contracts.ts`, `register.d.ts`, and `manifest.json`. |
| `validate` | Validate route files without writing output.                |
| `manifest` | Write `manifest.json` only.                                 |
| `watch`    | Generate once, then regenerate on route file changes.       |

## Route files

Route files may be JSON, JavaScript, TypeScript, or TSX modules. The normal app shape is:

```tsx
import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([{ id: 'home', path: '/', component: HomePage }] as const);
```

The extractor expects a static `defineRoutes([...])` call or a static `routes = [...]` array. Avoid runtime-generated route trees in files consumed by the CLI.

## Generated files

```txt
.cookbook-router/
  contracts.ts
  register.d.ts
  manifest.json
```

Include `contracts.ts` and `register.d.ts` in the app `tsconfig.json`.

## Programmatic API

```ts
import { generateCommand, validateCommand, watchCommand } from '@cookbook/router-cli';

await validateCommand({ routeFiles: ['src/routes.tsx'] });
await generateCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });

const watcher = watchCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });
await watcher.initial;
watcher.close();
```

The package also exports `manifestCommand`, `generateContracts`, `generateManifest`, `serializeManifest`, `generateRegister`, `loadRouteFiles`, `validateRouteFiles`, and `resolveRoutes`.

## CI usage

Recommended sequence:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
pnpm typecheck
pnpm test
pnpm build
```

## Troubleshooting

- If a route file cannot be evaluated, simplify the route declaration into a static array.
- If contracts are stale, rerun `generate` or use `watch` in development.
- If generated types are not visible, include the generated files in `tsconfig.json`.
- If a slot fallback ID is not generated, that is expected; fallbacks are not navigable routes.

## Related docs

- [Code generation](../../docs/codegen.md)
- [Contracts](../../docs/contracts.md)
- [Routing](../../docs/routing.md)
