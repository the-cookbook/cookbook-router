# React integration

`@cookbook/router-react` renders route matches from a core router instance. Matching, href generation, middleware, lifecycle, slots, redirects, and intercepts remain owned by `@cookbook/router`.

## Table of contents

- [Install](#install)
- [Provider setup](#provider-setup)
- [Static provider](#static-provider)
- [Links](#links)
- [Outlets](#outlets)
- [Slots](#slots)
- [Suspense and error fallbacks](#suspense-and-error-fallbacks)
- [Hooks](#hooks)
- [Outlet and slot context](#outlet-and-slot-context)
- [Interception in React](#interception-in-react)
- [Blocking unload](#blocking-unload)
- [Testing React routes](#testing-react-routes)
- [Provider edge cases](#provider-edge-cases)

## Install

```sh
pnpm add @cookbook/router @cookbook/router-react react react-dom
```

React and React DOM are peer dependencies of `@cookbook/router-react`.

## Provider setup

```tsx
import { createRouter } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { routes } from './routes';

const router = createRouter({ routes });
await router.resolveCurrent();

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

<Link to="users.show" params={{ id: '42' }}>
  User 42
</Link>

<NavLink to="users.show" params={{ id: '42' }} end>
  {({ isActive }) => <span data-active={isActive}>User 42</span>}
</NavLink>
```

Both components render anchors. `NavLink` adds active-state calculation and `aria-current` handling.

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
- a slot fallback
- an intercepted destination
- nothing, when the slot is empty or disabled
- a slot-level not-found component, when applicable

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
  component: ArticlePage,
  loading: ArticleLoading,
}
```

Use `errorFallback` for route-level render errors. The nearest active route with `errorFallback` handles errors thrown by its component, layout, slot routes, intercepted routes, and descendants.

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
  component: ArticlePage,
  errorFallback: ArticleErrorFallback,
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
await navigate.to({ route: 'users.show', params: { id: '42' } });
```

### `useHref()`

Generates a typed href.

```tsx
const href = useHref('users.show', { params: { id: '42' } });
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

Reads params from the current match or a route in the active branch.

```tsx
const params = useParams('users.show');
```

### `useSearch()`

Parses the current query string into an object.

```tsx
const search = useSearch('articles.index');
```

### `useHash()`

Returns the current hash without the leading `#`, or `null`.

```tsx
const section = useHash('articles.show');
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

## Interception in React

Configured intercept:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept="modal">
  Read in modal
</Link>
```

Call-site intercept:

```tsx
<Link
  to="blog.articles.show"
  params={{ slug }}
  intercept={{ slot: 'modal', component: ArticleModal }}
>
  Preview
</Link>
```

The component rendered in the slot receives the destination route context, so `useParams('blog.articles.show')` reads destination params.

## Blocking unload

`useBlocker()` attaches a browser `beforeunload` handler.

```tsx
const blocker = useBlocker({
  when: formIsDirty,
  message: 'You have unsaved changes.',
});

blocker.blocked; // boolean
```

This guards page unload/navigation handled by the browser. It is not a full in-app route transition blocker.

## Testing React routes

Prefer `createMemoryRouter()` and render the real provider.

```tsx
const router = createMemoryRouter({ routes, initialEntries: ['/users/42'] });
await router.resolveCurrent();

render(<RouterProvider router={router} fallback={<h1>Not found</h1>} />);
```

Avoid mocking route matching, href generation, or middleware pipelines in component tests unless the component is intentionally isolated from the router.

## Provider edge cases

- Call `router.resolveCurrent()` before first render when initial redirects or middleware should resolve before UI appears.
- `RouterProvider` suppresses redirect-only branches while resolving them.
- If a route has neither `component` nor `layout`, it renders its child branch or fallback.
- If no match exists, provider `fallback` is rendered.
