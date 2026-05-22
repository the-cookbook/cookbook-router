# @cookbook/router-react

React integration for Cookbook Router.

## Table of contents

- [Install](#install)
- [What this package provides](#what-this-package-provides)
- [Quick start](#quick-start)
- [Components](#components)
- [Hooks](#hooks)
- [Interception and slots](#interception-and-slots)
- [SSR](#ssr)
- [Related docs](#related-docs)

## Install

```sh
pnpm add @cookbook/router @cookbook/router-react react react-dom
```

`react` and `react-dom` are peer dependencies and must be installed by the app.

## What this package provides

- `RouterProvider`
- `StaticRouterProvider`
- `Link`
- `NavLink`
- `Outlet`
- `Slot`
- hooks for router, navigation, hrefs, params, search, hash, matches, location, outlet context, and unload blockers

## Quick start

```tsx
import { createRouter } from '@cookbook/router';
import { RouterProvider, Link, Outlet } from '@cookbook/router-react';
import { routes } from './routes';

const router = createRouter({ routes });
await router.resolveCurrent();

export function App() {
  return <RouterProvider router={router} fallback={<h1>Not found</h1>} />;
}

export function Layout() {
  return (
    <main>
      <Link to="home">Home</Link>
      <Outlet />
    </main>
  );
}
```

## Components

- `RouterProvider` renders the live route branch.
- `StaticRouterProvider` renders static route output for SSR.
- `Link` renders a route-aware anchor.
- `NavLink` renders an anchor with active state.
- `Outlet` renders primary child routes.
- `Slot` renders named slot regions and intercepted destinations.

## Hooks

- `useRouter()`
- `useNavigate()`
- `useHref()`
- `useLocation()`
- `useMatches()`
- `useNavigation()`
- `useParams()`
- `useSearch()`
- `useHash()`
- `useOutletContext()`
- `useBlocker()`

## Interception and slots

Use `Slot` in a layout and pass `intercept` to links for modal/drawer/detail previews that preserve the source page while the URL changes to the destination.

```tsx
<Slot name="modal" context={{ source: 'layout-default' }} />

<Link
  to="articles.show"
  params={{ slug }}
  intercept="modal"
  context={{ source: 'article-card' }}
>
  Preview
</Link>
```

The intercepted component reads navigation context with `useOutletContext()`. Navigation context overrides the slot context for that intercepted render and does not exist on direct visits.

## SSR

Server render with `StaticRouterProvider`; hydrate with `RouterProvider` and a router created with `hydrationData`.

## Related docs

- [Repository README](../../README.md)
- [React integration](../../docs/react-integration.md)
- [Navigation](../../docs/navigation.md)
- [Routing](../../docs/routing.md)
