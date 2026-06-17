# React integration

`@cookbook/router-react` renders route matches from a core router instance. Matching, href generation, middleware, lifecycle, slots, redirects, and intercepts remain owned by `@cookbook/router`. Params, search, hash parsing, normalization, and href URL building are URLKit-backed in the core router state consumed by React.

## Table of contents

- [Install](#install)
- [Public entrypoints](#public-entrypoints)
- [Provider setup](#provider-setup)
- [Static provider](#static-provider)
- [Links](#links)
- [Outlets](#outlets)
- [Slots](#slots)
- [Suspense and error fallbacks](#suspense-and-error-fallbacks)
- [Hooks](#hooks)
- [Outlet and slot context](#outlet-and-slot-context)
- [Interception in React](#interception-in-react)
- [Blocking navigation](#blocking-navigation)
- [Testing React routes](#testing-react-routes)
- [Provider edge cases](#provider-edge-cases)

## Install

```sh
pnpm add @cookbook/router @cookbook/router-react react react-dom
```

React and React DOM are peer dependencies of `@cookbook/router-react`.

## Public entrypoints

The root entrypoint exports the complete React API. Focused public entrypoints are available for hooks, links, outlets, and providers:

```tsx
import { useNavigate, useRouteMeta } from '@cookbook/router-react/hooks';
import { Link, NavLink } from '@cookbook/router-react/links';
import { Outlet, Slot } from '@cookbook/router-react/outlets';
import { RouterProvider, StaticRouterProvider } from '@cookbook/router-react/provider';
```

Use these package subpaths instead of private source-file imports. Root imports remain supported.

## Provider setup

```tsx
import { createRouter } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from './routes';

const router = createRouter({ routes });

await router.start();

export function App() {
  return <RouterProvider router={router} fallback={<h1>Not found</h1>} />;
}
```

`RouterProvider` subscribes to router state and renders the active route branch. If `children` are passed, the provider renders those children instead of the route branch. This is useful for custom renderers and tests.

## Static provider

```tsx
import { StaticRouterProvider } from '@cookbook/router-react';

const html = renderToString(<StaticRouterProvider router={router} fallback={<NotFoundPage />} />);
```

Use `StaticRouterProvider` with `createStaticRouter()` during SSR.

## Links

```tsx
import { Link, NavLink } from '@cookbook/router-react';

<Link to="users.show" params={{ id: 42 }}>
  User 42
</Link>

<NavLink to="users.show" params={{ id: 42 }} end>
  {({ isActive }) => <span data-active={isActive}>User 42</span>}
</NavLink>
```

Both views render anchors. `NavLink` adds active-state calculation and `aria-current` handling.

Route-id links forward `url` options to the core router. Hook/view URL options override route-level and router-level defaults.

```tsx
<Link to="products" search={{ tags: ['router', 'typescript'] }} url={{ arrayFormat: 'comma' }}>
  Products
</Link>
```

## Outlets

`Outlet` renders the next primary child branch.

```tsx
import { Outlet } from '@cookbook/router-react';

export function RootLayout() {
  return (
    <main>
      <Outlet />
    </main>
  );
}
```

Pass context to the direct child route:

```tsx
<Outlet context={{ user }} />
```

## Slots

`Slot` renders a named layout slot.

```tsx
import { Outlet, Slot } from '@cookbook/router-react';

export function DashboardLayout() {
  return (
    <main>
      <Outlet />
      <Slot name="sidebar" context={{ source: 'dashboard' }} />
      <Slot name="modal" />
    </main>
  );
}
```

A slot can render:

- a matched slot route
- the slot's declared default view
- an intercepted destination
- nothing, when the slot is empty or disabled
- a slot-level not-found view, when applicable

## Suspense and error fallbacks

`@cookbook/router-react` wraps each matched route segment in React Suspense and, when configured, a React error boundary. This keeps loading and render-error UI colocated with the route that owns it.

Use `loading` for a route-level Suspense fallback:

```tsx
import { lazy } from 'react';

const ArticlePage = lazy(() => import('./article-page'));

function ArticleLoading() {
  return <ArticleSkeleton />;
}

{
  id: 'blog.articles.show',
  path: 'articles/{slug}',
  view: ArticlePage,
  loading: ArticleLoading,
}
```

Use `error` for route-level render errors. The nearest active route with `error` handles errors thrown by its view, layout, slot routes, intercepted routes, and descendants.

```tsx
import type { RouteErrorFallbackProps } from '@cookbook/router-react';

function ArticleErrorFallback(props: RouteErrorFallbackProps) {
  return (
    <section role="alert">
      <h1>Article failed to render</h1>
      <button type="button" onClick={props.reset}>
        Try again
      </button>
    </section>
  );
}

{
  id: 'blog.articles.show',
  path: 'articles/{slug}',
  view: ArticlePage,
  error: ArticleErrorFallback,
}
```

`RouterProvider` and `StaticRouterProvider` also accept global fallbacks when a route does not provide one:

```tsx
<RouterProvider
  router={router}
  fallback={<NotFoundPage />}
  loadingFallback={<AppSkeleton />}
  errorFallback={AppErrorFallback}
/>
```

`fallback` is only the not-found UI. Use `loadingFallback` for Suspense and `errorFallback` for React render errors. Middleware and lifecycle errors remain router transition errors and continue to flow through router error handling.

## Hooks

### `useRouter()`

Returns the router instance.

```tsx
const router = useRouter();
```

### `useNavigate()`

Returns `router.navigate`.

```tsx
const navigate = useNavigate();
await navigate.to({ route: 'users.show', params: { id: 42 } });
```

### `useHref()`

Generates a typed href.

```tsx
const href = useHref('users.show', { params: { id: 42 } });
```

### `useLocation()`

Returns the current `RouterLocation`.

```tsx
const location = useLocation();
```

### `useMatches()`

Returns the current matched branch.

```tsx
const matches = useMatches();
```

### `useNavigation()`

Returns the navigation state.

```tsx
const navigation = useNavigation();
```

### `useParams()`

Reads URLKit-parsed params from the current match or a route in the active branch. Built-in numeric constraints parse to numbers, so `{id:int}`, `{price:decimal}`, and `{page:range(1,100)}` expose numbers. `list`, `regex`, unconstrained params, and custom constraints expose `string` unless the generated contract says otherwise. Wildcards expose `readonly string[]` path segments.

```tsx
const params = useParams('users.show');
// params.id is a number for `/users/{id:int}`
```

### `useSearchParams()`

Reads declared URLKit-parsed search state from the active match. This hook consumes already-resolved router state and does not accept `url` options. Configure route-resolution policies such as `invalidSearch`, `unknownSearch`, and `invalidHash` on the core router, the route definition, explicit match calls, or static router creation.

```tsx
const search = useSearchParams('products');
```

When `unknownSearch: 'preserve'` is configured, unknown query keys are exposed separately through `useUnknownSearchParams()` instead of being merged into declared typed search.

```tsx
const search = useSearchParams('overview');
const unknownSearch = useUnknownSearchParams();
```

`RouterProvider` does not define separate URL defaults; configure framework-agnostic defaults on the core router.

### `useHashParams()`

Reads URLKit-parsed hash state from the active match, or `null` when no hash is present.

```tsx
const section = useHashParams('articles.show');
```

### `useUnknownSearchParams()`

Reads URLKit-preserved unknown search params from the active match. This returns keys that were present in the URL but not declared by the active route's `search` descriptor when the effective URL policy is `unknownSearch: 'preserve'`.

```tsx
const unknownSearch = useUnknownSearchParams();

unknownSearch.utm_source;
// string | readonly string[] | undefined
```

It returns an empty object when no unknown search params were preserved.

### `useRouteMeta()`

Reads route metadata for the current rendered route or an explicit route ID.

```tsx
const localMeta = useRouteMeta();
const mergedMeta = useRouteMeta({ includeAncestors: true });
const metaChain = useRouteMeta({ includeAncestors: true, merge: false });
```

Use an explicit route ID to read metadata outside that route's active render context:

```tsx
const usersMeta = useRouteMeta('users.index', { includeAncestors: true });
```

### `useOutletContext()`

Reads nearest outlet or slot context.

```tsx
const context = useOutletContext<{ user: User }>();
```

Generated route ID form is available when generated contracts include outlet context:

```tsx
const context = useOutletContext('dashboard.home');
```

Strict mode throws when no context is present:

```tsx
const context = useOutletContext<{ user: User }>({ strict: true });
```

## Outlet and slot context

Context is provided by the nearest rendered `Outlet` or `Slot`. It is intentionally local.

```tsx
<Outlet context={{ parentData }} />
<Slot name="sidebar" context={{ user }} />
```

Do not use outlet context as a replacement for URL state. Use params, search, and hash for state that belongs in the URL.

## Slot error fallbacks

By default, slot render errors bubble to the nearest route or provider error fallback. Pass `errorFallback` to isolate an error to the slot instead.

```tsx
<Slot name="modal" errorFallback={null} />
```

```tsx
<Slot
  name="modal"
  errorFallback={({ error, reset }) => <ModalError error={error} onRetry={reset} />}
/>
```

```tsx
<Slot name="modal" errorFallback={ModalError} />
```

The fallback receives `error` and `reset`. `errorFallback={null}` renders nothing for slot errors.

## Interception in React

Configured intercept:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept="modal">
  Read in modal
</Link>
```

Inline intercept:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept={{ slot: 'modal', view: ArticleModal }}>
  Preview
</Link>
```

Bypass a configured intercept for one link when the destination should render as the canonical page:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept={false}>
  Open full page
</Link>
```

The view rendered in the slot receives the destination route context, so `useParams('blog.articles.show')` reads destination params.

## Blocking navigation

`useBlocker()` blocks in-app router navigation while `when` is true and also attaches a browser `beforeunload` handler. Browsers control unload confirmation text; custom browser unload messages are not guaranteed.

```tsx
const blocker = useBlocker({
  when: formIsDirty,
  message: 'You have unsaved changes.',
});

blocker.blocked; // boolean
```

When `message` is provided in the browser, the hook asks for confirmation before allowing in-app router navigation. A cancelled confirmation keeps the current route active and sets router navigation state to `blocked`.

## Testing React routes

Prefer `createMemoryRouter()` and render the real provider.

```tsx
const router = createMemoryRouter({ routes, initialEntries: ['/users/42'] });

await router.start();

render(<RouterProvider router={router} fallback={<h1>Not found</h1>} />);
```

Avoid mocking route matching, href generation, or middleware pipelines in view tests unless the view is intentionally isolated from the router.

## Provider edge cases

- Call `router.start()` before first render when initial redirects or middleware should resolve before UI appears.
- `RouterProvider` suppresses redirect-only branches while resolving them.
- If a route has neither `view` nor `layout`, it renders its child branch or fallback.
- If no match exists, provider `fallback` is rendered.
