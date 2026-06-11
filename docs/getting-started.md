# Getting started

This guide creates a typed React app with route definitions, generated contracts, typed links, and a not-found fallback.

## Table of contents

- [Install](#install)
- [Define routes](#define-routes)
- [Create pages and layout](#create-pages-and-layout)
- [Create the router](#create-the-router)
- [Render React](#render-react)
- [Generate contracts](#generate-contracts)
- [Use typed navigation](#use-typed-navigation)
- [Add a not-found fallback](#add-a-not-found-fallback)
- [Run locally](#run-locally)
- [Next steps](#next-steps)

## Install

```sh
pnpm add @cookbook/router @cookbook/router-react react react-dom
pnpm add -D @cookbook/router-cli
```

`@cookbook/router-react` declares React as a peer dependency, so the app must install `react` and `react-dom`. `@cookbook/urlkit` and `@cookbook/pathkit` are installed transitively by `@cookbook/router`.

## Define routes

Create `src/routes.ts`.

```tsx
import { defineRoutes } from '@cookbook/router';
import { HomePage, RootLayout, UserPage, NotFoundPage } from './pages';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      view: RootLayout,
    },
    children: [
      {
        id: 'home',
        index: true,
        view: HomePage,
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: { type: 'string', optional: true },
        },
        hash: { type: 'enum', values: ['profile', 'settings', 'security'], optional: true },
        view: UserPage,
        meta: {
          title: 'User',
          requiresAuth: true,
        },
      },
      {
        id: 'not-found',
        path: '{*path}',
        view: NotFoundPage,
        meta: {
          title: 'Not found',
        },
      },
    ],
  },
] as const);
```

Use `as const` so route IDs, paths, hash values, URL options, and metadata remain literal enough for the CLI to generate useful contracts. Route files consumed by the CLI should use static descriptors, not URLKit runtime builders.

## Create pages and layout

Create `src/pages.tsx`.

```tsx
import { Link, Outlet, useParams, useSearchParams, useHashParams } from '@cookbook/router-react';

export function RootLayout() {
  return (
    <main>
      <nav>
        <Link to="home">Home</Link>
        <Link to="users.show" params={{ id: 42 }} search={{ tab: 'settings' }} hash="profile">
          User 42
        </Link>
      </nav>
      <Outlet />
    </main>
  );
}

export function HomePage() {
  return <h1>Home</h1>;
}

export function UserPage() {
  const params = useParams('users.show');
  const search = useSearchParams('users.show');
  const hash = useHashParams('users.show');

  return (
    <article>
      <h1>User {params.id}</h1>
      <p>Tab: {search.tab ?? 'none'}</p>
      <p>Hash: {hash ?? 'none'}</p>
    </article>
  );
}

export function NotFoundPage() {
  return <h1>Not found</h1>;
}
```

## Create the router

Create `src/router.ts`.

```ts
import { createRouter } from '@cookbook/router';
import { routes } from './routes';

export const router = createRouter({
  routes,
});
```

The default router chooses browser history when `window` exists and memory history otherwise. You can pass `basename`, `middleware`, `lifecycle`, `pathOptions`, or a custom `history` when needed. If route definitions use custom path constraints, pass `pathConstraints` to `defineRoutes()` so immediate validation can see them. See [Path routes and constraints](path-routes.md) for built-in constraints and custom constraints.

## Render React

Create `src/main.tsx`.

```tsx
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@cookbook/router-react';
import { router } from './router';

router
  .start()
  .then(() =>
    createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />),
  );
```

`start()` resolves the router's current history or static location before the
first render, so redirects, canonical URL cleanup, middleware, lifecycle hooks,
and SSR hydration state are applied before your UI mounts.

## Generate contracts

Add scripts to `package.json`.

```json
{
  "scripts": {
    "generate:routes": "cookbook-router generate --routes src/routes.ts --out-dir .cookbook-router",
    "validate:routes": "cookbook-router validate --routes src/routes.ts"
  }
}
```

Run generation:

```sh
pnpm generate:routes
```

Add the generated directory to `tsconfig.json`.

```json
{
  "include": ["src", ".cookbook-router"]
}
```

Once `.cookbook-router` is included in your TypeScript program, it augments `@cookbook/router` with the generated route contracts.

Router APIs can then infer valid route IDs, exact route paths, path params, search values, hash values, and route metadata from the generated public types. Path params follow the generated constraint contract: numeric built-in constraints such as `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` become `number`; unconstrained params, wildcards, string-shaped constraints such as `uuid`, `regex`, `list`, `minlength`, `maxlength`, and custom constraints are exposed as `string` unless combined with a numeric built-in constraint.

## Use typed navigation

```tsx
import { useNavigate } from '@cookbook/router-react';

export function OpenSettingsButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        void navigate.to({
          route: 'users.show',
          params: { id: 42 },
          search: { tab: 'settings' },
          hash: 'security',
        });
      }}
    >
      Open settings
    </button>
  );
}
```

A two-argument form is also supported:

```ts
await navigate.to('users.show', {
  params: { id: 42 },
});
```

## Router-level fallback

`RouterProvider.fallback` is the last-resort UI for unmatched locations that do
not resolve to any route.

```tsx
<RouterProvider router={router} fallback={<h1>Not found</h1>} />
```

Use it for simple apps, prototypes, tests, or as a defensive fallback while route
definitions are still incomplete.

For production route handling, prefer an explicit catch-all route:

```tsx
{
  id: 'not-found',
  path: '{*path}',
  view: NotFoundPage,
}
```

A catch-all route participates in normal Cookbook Router matching. That means it
can use the same routing features as any other route, including layouts,
middleware, redirects, rewrites, lifecycle hooks, metadata, slots, and generated
contracts.

You can also place catch-all routes under specific layouts or route groups to
show different not-found pages in different parts of the app, example:

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    view: DashboardLayout,
  },
  children: [
    {
      id: 'dashboard.home',
      index: true,
      view: DashboardHomePage,
    },
    {
      id: 'dashboard.not-found',
      path: '{*path}',
      view: DashboardNotFoundPage,
    },
  ],
}
```

In this example, unknown `/dashboard/*` URLs keep `DashboardLayout` mounted while
`DashboardNotFoundPage` renders inside it.

## Run locally

```sh
pnpm generate:routes
pnpm dev
```

When working inside this monorepo, rebuild package outputs before running examples after changing package source:

```sh
pnpm build:packages
pnpm --filter react-blog dev
```

## Next steps

- Read [Routing](routing.md) for route definition details.
- Read [React integration](react-integration.md) for views and hooks.
- Read [Code generation](codegen.md) and [Contracts](contracts.md) for generated typing.
- Read [SSR](ssr.md) for server rendering and hydration.
