# Core API reference

This page lists the public APIs exported from `@cookbook/router`, `@cookbook/router-react`, and `@cookbook/router-cli`. It is intentionally limited to package-root exports.

## Table of contents

- [`@cookbook/router`](#cookbookrouter)
- [`@cookbook/router-react`](#cookbookrouter-react)
- [`@cookbook/router-cli`](#cookbookrouter-cli)
- [Route contracts](#route-contracts)
- [History contracts](#history-contracts)
- [Common API choices](#common-api-choices)

## `@cookbook/router`

### `defineRoutes(routes)`

Preserves route literals for route definitions.

```ts
import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([{ id: 'home', path: '/', component: HomePage }] as const);
```

### `createRouter(options)`

Creates a browser-capable router runtime. In non-browser environments, it falls back to memory history unless a history is supplied.

```ts
import { createRouter } from '@cookbook/router';

const router = createRouter({
  routes,
  basename: '/app',
  maxRedirectDepth: 10,
  pathOptions: {
    prune: 'all',
  },
});
```

Supported options:

| Option                | Type                         | Purpose                                                              |
| --------------------- | ---------------------------- | -------------------------------------------------------------------- |
| `routes`              | `readonly RouteDefinition[]` | Required route tree.                                                 |
| `basename`            | `string`                     | Visible URL prefix. Matching strips it; href generation includes it. |
| `middleware`          | `readonly Middleware[]`      | Global middleware pipeline.                                          |
| `lifecycle`           | `GlobalLifecycle`            | Global transition hooks.                                             |
| `hydrationData`       | `SerializedRouterState`      | SSR hydration state.                                                 |
| `history`             | `RouterHistory`              | Custom history implementation.                                       |
| `pathOptions`         | `RouterPathOptions`          | Pathkit options. Defaults to `{ prune: 'all' }`.                     |
| `maxRedirectDepth`    | `number`                     | Redirect loop guard.                                                 |
| `maxRedirectionDepth` | `number`                     | Backward-compatible alias for `maxRedirectDepth`.                    |

### `createMemoryRouter(options)`

Creates a router backed by in-memory history.

```ts
import { createMemoryRouter } from '@cookbook/router';

const router = createMemoryRouter({
  routes,
  initialEntries: ['/users/42?tab=settings'],
});
```

Use it for tests, examples, Storybook-like environments, and non-browser runtime flows.

### `createStaticRouter(options)`

Creates a router backed by static history for SSR.

```ts
import { createStaticRouter } from '@cookbook/router';

const router = createStaticRouter({
  routes,
  url: '/blog/articles/router-ssr',
});
```

`url` may be a string, `URL`, or `Request`. You may also pass `{ request }`.

### Router instance

```ts
interface Router {
  readonly routes: readonly NormalizedRoute[];
  readonly rankedRoutes: readonly RankedRoute[];
  readonly state: RouterState;
  href(routeId, options?): string;
  href(options): string;
  resolve(routeId, options?): RouterLocation;
  resolve(options): RouterLocation;
  match(pathname): RouteMatch | null;
  navigate: {
    to(routeId, options?): Promise<void>;
    to(options): Promise<void>;
    replace(routeId, options?): Promise<void>;
    replace(options): Promise<void>;
    back(): void;
    forward(): void;
    go(delta: number): void;
  };
  subscribe(listener): () => void;
  resolveCurrent(): Promise<void>;
  serialize(): SerializedRouterState;
}
```

Prefer object-form navigation for new code:

```ts
await router.navigate.to({
  route: 'blog.articles.show',
  params: { slug: 'typed-routing' },
  search: { ref: 'home' },
  hash: 'comments',
});
```

### Matching and normalization helpers

The package also exports lower-level helpers used by tests, tooling, and advanced integrations:

- `validateRoutes(routes)`
- `normalizeRoutes(routes, pathOptions?)`
- `rankRoutes(routes)`
- `flattenRoutes(routes)`
- `matchRoutes(routes, pathname, pathOptions?)`
- `runMiddleware(middleware, context)`
- `runBeforeNavigate(...)`, `runAfterNavigate(...)`, `runNavigationError(...)`
- `completeTransition(...)`, `runTransition(...)`
- `resolveSlots(...)`, `getResolvedSlot(...)`
- `resolveIntercept(...)`, `restoreInterceptFromState(...)`, `createInterceptHistoryState(...)`
- `createMemoryHistory(...)`, `createBrowserHistory(...)`, `createStaticHistory(...)`, `parseHref(...)`

Use these only when building tooling or tests. Application code should usually use a router instance.

### Serialization helpers

```ts
import {
  deserializeRouterState,
  serializeRouterState,
  stringifyRouterState,
} from '@cookbook/router';

const state = serializeRouterState(router);
const json = stringifyRouterState(router);
const parsed = deserializeRouterState(json);
```

Use these for SSR hydration. `deserializeRouterState()` validates the parsed shape before it is used.

## `@cookbook/router-react`

### Providers

```tsx
import { RouterProvider, StaticRouterProvider } from '@cookbook/router-react';
```

- `RouterProvider` renders a live router and subscribes to router state.
- `StaticRouterProvider` renders a router for SSR/static output.

```tsx
<RouterProvider router={router} fallback={<h1>Not found</h1>} />
<StaticRouterProvider router={router} fallback={<h1>Not found</h1>} />
```

### Links

```tsx
import { Link, NavLink } from '@cookbook/router-react';

<Link to="users.show" params={{ id: '42' }}>User</Link>

<NavLink to="users.show" params={{ id: '42' }} end>
  {({ isActive }) => <span data-active={isActive}>User</span>}
</NavLink>
```

`Link` renders a real anchor. Unmodified same-origin route clicks are intercepted. Modifier clicks, non-left clicks, `target="_blank"`, downloads, and external links keep browser behavior.

### Layout components

```tsx
import { Outlet, Slot } from '@cookbook/router-react';

<Outlet context={{ user }} />
<Slot name="sidebar" context={{ user }} />
```

`Outlet` renders the primary child branch. `Slot` renders a named slot branch, fallback, or intercepted destination.

### Hooks

| Hook                             | Purpose                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `useRouter()`                    | Return the router instance.                                                     |
| `useNavigate()`                  | Return `router.navigate`.                                                       |
| `useHref(route, options?)`       | Generate a typed href.                                                          |
| `useLocation()`                  | Read current `RouterLocation`.                                                  |
| `useMatches()`                   | Read current matched branch.                                                    |
| `useNavigation()`                | Read navigation state: `idle`, `pending`, `redirecting`, `blocked`, or `error`. |
| `useParams(routeId?)`            | Read route params.                                                              |
| `useSearch(routeId?)`            | Read query params as an object.                                                 |
| `useHash(routeId?)`              | Read hash without the leading `#`, or `null`.                                   |
| `useOutletContext()`             | Read nearest outlet/slot context.                                               |
| `useBlocker({ when, message? })` | Add a browser `beforeunload` blocker.                                           |

### Render helpers and contexts

The package exports `renderMatches`, `useRouterState`, `RouterContext`, `OutletContext`, `RouteRenderContext`, `SlotRenderContext`, and `useRouterContext` for advanced integrations and tests. Most applications should not need them.

## `@cookbook/router-cli`

### CLI commands

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router watch --routes src/routes.tsx --out-dir .cookbook-router
```

The package also publishes the `cbr` alias.

### Programmatic commands

```ts
import { generateCommand, validateCommand, watchCommand } from '@cookbook/router-cli';

await validateCommand({ routeFiles: ['src/routes.tsx'] });
await generateCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });

const watcher = watchCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });
await watcher.initial;
watcher.close();
```

The CLI also exports `generateContracts`, `generateManifest`, `serializeManifest`, `generateRegister`, `loadRouteFiles`, `validateRouteFiles`, `manifestCommand`, and `resolveRoutes`.

## Route contracts

The generated registration augments `@cookbook/router` through the exported `Register` interface.

```ts
import type { RouterContracts } from './contracts';

declare module '@cookbook/router' {
  interface Register {
    contracts: RouterContracts;
  }
}

export {};
```

Registered types include:

- `RouteId`
- `RouteParams<Route>`
- `RouteSearch<Route>`
- `RouteHash<Route>`
- `RouteHashInput<Route>`
- `RouteMeta<Route>`
- `RouteOutletContext<Route>`
- `RouteUrlOptions<Route>`
- `RouterContracts`

## History contracts

`RouterLocation` contains:

```ts
interface RouterLocation {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly href: string;
  readonly state?: unknown;
  readonly key: string;
}
```

Rules:

- `pathname` excludes search and hash.
- `search` includes the leading `?` when present.
- `hash` includes the leading `#` when present.
- `href` is `pathname + search + hash`.
- history `state` must be structured-cloneable in browser history.

## Common API choices

- Use `to` on React links. `route` is also supported.
- Use object-form navigation for new code.
- Use route-object redirects for internal route targets.
- Use string redirects for literal hrefs. Absolute URLs leave the app in browser history.
- Use `createMemoryRouter()` for tests rather than mocking route internals.
- Use `createStaticRouter()` for SSR.
