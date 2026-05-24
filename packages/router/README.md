# @cookbook/router

Framework-agnostic typed routing runtime for Cookbook Router.

## Table of contents

- [Install](#install)
- [What this package provides](#what-this-package-provides)
- [Quick start](#quick-start)
- [Router options](#router-options)
- [Router instance](#router-instance)
- [SSR and histories](#ssr-and-histories)
- [Generated contracts](#generated-contracts)
- [Related docs](#related-docs)

## Install

```sh
pnpm add @cookbook/router
```

For React apps, also install `@cookbook/router-react`, `react`, and `react-dom`. `@cookbook/pathkit` is installed transitively by `@cookbook/router`.

## What this package provides

- route definition with `defineRoutes`
- validation and normalization
- deterministic matching and ranking
- href generation
- route redirects
- middleware and lifecycle pipelines
- browser, memory, and static history integration
- SSR serialization helpers
- slots and intercept resolution
- generated contract types
- custom path constraints through `createConstraint()` and `pathConstraints`

## Quick start

```tsx
import { createRouter, defineRoutes } from '@cookbook/router';

const routes = defineRoutes([
  {
    id: 'home',
    path: '/',
    component: HomePage,
  },
  {
    id: 'users.show',
    path: '/users/{id:int}',
    component: UserPage,
  },
] as const);

const router = createRouter({ routes });
await router.resolveCurrent();

await router.navigate.to({
  route: 'users.show',
  params: { id: '42' },
});
```

## Router options

```ts
createRouter({
  routes,
  basename: '/app',
  middleware: [],
  lifecycle: {},
  hydrationData,
  history,
  pathOptions: { prune: 'all' },
  maxRedirectDepth: 10,
});
```

`pathOptions.prune` defaults to `'all'`. For custom constraints used inside `defineRoutes()`, pass `pathConstraints` to `defineRoutes()` so validation can see them. `createRouter({ pathConstraints })` is available for unvalidated route arrays. `maxRedirectionDepth` is accepted as an alias for `maxRedirectDepth`.

## Router instance

Important methods:

- `router.href(...)`
- `router.resolve(...)`
- `router.match(pathname)`
- `router.navigate.to(...)`
- `router.navigate.replace(...)`
- `router.navigate.back()`
- `router.navigate.forward()`
- `router.navigate.go(delta)`
- `router.subscribe(listener)`
- `router.resolveCurrent()`
- `router.serialize()`

## SSR and histories

Use:

- `createRouter()` for browser/runtime usage
- `createMemoryRouter()` for tests and memory navigation
- `createStaticRouter()` for SSR
- `serializeRouterState()`, `stringifyRouterState()`, and `deserializeRouterState()` for hydration data

## Generated contracts

The core package exports contract utility types such as `RouteId`, `RouteParams`, `RouteSearch`, `RouteHash`, `RouteMeta`, and `RouteOutletContext`. They become app-specific after `@cookbook/router-cli` generates and registers contracts.

## Related docs

- [Repository README](../../README.md)
- [Core API reference](../../docs/api.md)
- [Routing](../../docs/routing.md)
- [Navigation](../../docs/navigation.md)
- [SSR](../../docs/ssr.md)
