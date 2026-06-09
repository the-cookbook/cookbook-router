# @cookbook/router

Framework-agnostic typed routing runtime for Cookbook Router.

Use this package for route definitions, matching, href generation, navigation, middleware, lifecycle hooks, SSR router state, histories, slots, intercepts, redirects, and generated contract types. URL state is backed by `@cookbook/urlkit`; routing behavior remains owned by Cookbook Router.

## Table of contents

- [Install](#install)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Public entrypoint](#public-entrypoint)
- [Route definition API](#route-definition-api)
- [Router creation API](#router-creation-api)
- [Router instance API](#router-instance-api)
- [Navigation and hrefs](#navigation-and-hrefs)
- [Middleware and lifecycle](#middleware-and-lifecycle)
- [SSR and histories](#ssr-and-histories)
- [Generated contracts](#generated-contracts)
- [Custom path constraints](#custom-path-constraints)
- [Advanced public helpers](#advanced-public-helpers)
- [Troubleshooting](#troubleshooting)
- [Related docs](#related-docs)

## Install

```sh
pnpm add @cookbook/router
```

For React apps:

```sh
pnpm add @cookbook/router @cookbook/router-react react react-dom
pnpm add -D @cookbook/router-cli
```

`@cookbook/urlkit` and `@cookbook/pathkit` are installed transitively by `@cookbook/router`. PathKit remains external and is used beneath URLKit for path-pattern primitives.

## Requirements

- Node.js `>=18`
- ESM imports are supported through `exports.import`
- CommonJS consumers can use the package root through `exports.require`
- Do not deep import from `dist` or `src`; use the package root only

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
    search: {
      tab: { type: 'string', optional: true },
    },
    hash: { type: 'enum', values: ['profile', 'settings'], optional: true },
    component: UserPage,
  },
] as const);

const router = createRouter({ routes });
await router.resolveCurrent();

const href = router.href({
  route: 'users.show',
  params: { id: 42 },
  search: { tab: 'settings' },
  hash: 'profile',
});

await router.navigate.to({
  route: 'users.show',
  params: { id: 42 },
});
```

Expected `href`:

```txt
/users/42?tab=settings#profile
```

## Public entrypoint

The package exposes only the package root and `./package.json`:

```ts
import { createRouter, defineRoutes } from '@cookbook/router';
import type { RouteId, RouteParams } from '@cookbook/router';
```

Package-root exports are documented in the [API reference](../../docs/api.md#cookbookrouter).

## Route definition API

```ts
function defineRoutes<const Routes extends readonly RouteDefinition[]>(
  routes: Routes,
  options?: DefineRoutesOptions,
): Routes;

interface DefineRoutesOptions {
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
}
```

`defineRoutes()` preserves route literals for generated contracts and validates immediately.

Common route fields:

| Field       | Purpose                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`        | Stable public route ID.                                                                                            |
| `path`      | URL path segment or absolute path.                                                                                 |
| `index`     | Default child route for a parent path.                                                                             |
| `component` | Framework-owned render value.                                                                                      |
| `layout`    | Layout component and slot configuration.                                                                           |
| `children`  | Primary child routes.                                                                                              |
| `redirect`  | Internal route redirect or literal href.                                                                           |
| `search`    | URLKit-compatible static search descriptor for parsed search state and generated contracts.                        |
| `hash`      | URLKit-compatible static hash descriptor for parsed hash state and generated contracts.                            |
| `url`       | Route-level URLKit options such as `arrayFormat`, `defaults`, `invalidSearch`, `invalidHash`, and `unknownSearch`. |

When `unknownSearch` is `preserve`, URLKit keeps undeclared query keys as a sibling `unknownSearch` object on the matched route. Declared typed search remains in `match.search`.

```ts
const match = router.match('/overview?page=0&utm_source=website');

match?.search;
// { page: 0 }

match?.unknownSearch;
// { utm_source: 'website' }
```

| `middleware` | Route-specific middleware. |
| `lifecycle` | Route-specific lifecycle hooks. |

See [Routing](../../docs/routing.md) for the full route shape.

## Router creation API

```ts
function createRouter(options: CreateRouterOptions): Router;
function createMemoryRouter(options: CreateMemoryRouterOptions): Router;
function createStaticRouter(options: CreateStaticRouterOptions): Router;
```

`createRouter()` options:

```ts
interface CreateRouterOptions {
  readonly routes: readonly RouteDefinition[];
  readonly basename?: string;
  readonly middleware?: readonly Middleware[];
  readonly lifecycle?: GlobalLifecycle;
  readonly hydrationData?: SerializedRouterState;
  readonly history?: RouterHistory;
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly maxRedirectDepth?: number;
  readonly maxRedirectionDepth?: number;
  readonly url?: RouterUrlOptions;
}
```

Use:

- `createRouter()` for browser/runtime usage
- `createMemoryRouter()` for tests and memory-only environments
- `createStaticRouter()` for server rendering

## Router instance API

Important router members:

```ts
router.href(routeId, options);
router.href({ route, params, search, hash, url });
router.resolve(routeId, options);
router.resolve({ route, params, search, hash, url });
router.match(href);

const matched = router.match('/login?redirect=%2Foverview');
if (matched) {
  await router.navigate.replace(matched.id, {
    params: matched.params,
    search: matched.search,
    hash: matched.hash,
  });
}
router.navigate.to(routeId, options);
router.navigate.to({ route, params, search, hash, url });
router.navigate.replace({ route, params, search, hash, url });
router.navigate.back();
router.navigate.forward();
router.navigate.go(delta);
router.subscribe(listener);
router.resolveCurrent();
router.serialize();
```

Navigation methods return `Promise<RouterState>` for `to` and `replace`. History movement methods return `void`.

## Navigation and hrefs

Prefer object-form navigation:

```ts
await router.navigate.to({
  route: 'articles.show',
  params: { slug: 'typed-routing' },
  search: { ref: 'home' },
  hash: 'comments',
});
```

Use `router.href()` when rendering links outside React. Path params, search, and hash are parsed/built by URLKit, so `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` params use numbers:

```ts
const href = router.href({
  route: 'articles.show',
  params: { slug: 'typed-routing' },
});

const products = router.href('products', {
  search: { tags: ['router', 'typescript'] },
  url: { arrayFormat: 'comma' },
});
```

See [Navigation](../../docs/navigation.md).

## Middleware and lifecycle

Global middleware and lifecycle hooks are passed to `createRouter()`.

```ts
const router = createRouter({
  routes,
  middleware: [authMiddleware],
  lifecycle: {
    beforeNavigate({ to }) {
      return Boolean(to);
    },
    afterNavigate({ location }) {
      analytics.page(location.href);
    },
  },
});
```

Route-level `middleware` and `lifecycle` are defined on individual route records.

See [Middleware](../../docs/middleware.md) and [Lifecycle](../../docs/lifecycle.md).

## SSR and histories

```ts
import { createStaticRouter, deserializeRouterState, stringifyRouterState } from '@cookbook/router';

const router = createStaticRouter({ routes, url: '/articles/typed-routing' });
await router.resolveCurrent();

const hydrationJson = stringifyRouterState(router);
const hydrationData = deserializeRouterState(hydrationJson);
```

History helpers are also public:

- `createBrowserHistory()`
- `createMemoryHistory()`
- `createStaticHistory()`
- `parseHref()`

See [SSR](../../docs/ssr.md).

## Generated contracts

The core package exports contract utility types:

- `RouteId`
- `RouteParams<Route>`
- `RouteSearch<Route>`
- `RouteHash<Route>`
- `RouteHashInput<Route>`
- `RouteMeta<Route>`
- `RouteOutletContext<Route>`
- `RouteUrlOptions<Route>`
- `RouterContracts`
- `Register`

They become app-specific after `@cookbook/router-cli` generates `contracts.ts` and `register.d.ts`. Generated params/search/hash follow URLKit parsing semantics: `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` become `number`; `uuid`, `minlength`, `maxlength`, `list`, `regex`, and custom constraints remain `string`; URLKit-compatible search/hash descriptors produce parsed value types. Static `date` and `date-time` search fields parse to `Date` with UTC semantics.

See [Contracts](../../docs/contracts.md) and [Code generation](../../docs/codegen.md).

## Custom path constraints

```ts
import { createConstraint, defineRoutes } from '@cookbook/router';

const slug = createConstraint({
  parse(paramName, value) {
    if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
      throw new Error(`${paramName} must be a slug.`);
    }
  },
  verify() {},
  toRegExp() {
    return '[a-z0-9-]+';
  },
});

const routes = defineRoutes([{ id: 'posts.show', path: '/posts/{slug:slug}' }] as const, {
  pathConstraints: { slug },
});

// The generated param type for `slug` remains string. Built-in `{id:int}` and
// `{value:range(1,10)}` constraints parse to number.
```

Also exported:

- `registerPathConstraints()`
- `hasConstraint()`
- `getConstraint()`
- `unregisterConstraint()`

## Advanced public helpers

The package root intentionally keeps the public v1 surface small. Advanced helpers are available for validation, code generation, and framework integrations:

- `validateRoutes()`
- `normalizeRoutes()`
- `matchRoutes()`
- `getResolvedSlot()`
- history factories such as `createMemoryHistory()`
- diagnostic error factories

Internal middleware runners, transition runners, slot resolvers, and intercept resolvers are not exported from the package root. Application code should usually prefer `createRouter()` and the router instance API.

## Troubleshooting

- If custom constraints are unknown, pass them to `defineRoutes(..., { pathConstraints })` or `createRouter({ pathConstraints })` for raw route arrays so URLKit can validate and compile route contracts.
- If redirects do not run before first render, call `await router.resolveCurrent()` before rendering.
- If route types are too broad, run `@cookbook/router-cli generate` and include generated files in `tsconfig.json`.
- If tests need navigation, use `createMemoryRouter()` instead of mocking internals.

See [Troubleshooting](../../docs/troubleshooting.md).

## Related docs

- [Repository README](../../README.md)
- [API reference](../../docs/api.md#cookbookrouter)
- [Getting started](../../docs/getting-started.md)
- [Routing](../../docs/routing.md)
- [Navigation](../../docs/navigation.md)
- [Search and hash](../../docs/search-and-hash.md)
- [Middleware](../../docs/middleware.md)
- [Lifecycle](../../docs/lifecycle.md)
- [SSR](../../docs/ssr.md)
- [Testing](../../docs/testing.md)
- [Troubleshooting](../../docs/troubleshooting.md)
