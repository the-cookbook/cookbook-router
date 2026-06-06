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

Create `src/routes.tsx`.

```tsx
import { defineRoutes } from '@cookbook/router';
import { HomePage, RootLayout, UserPage } from './pages';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      component: RootLayout,
    },
    children: [
      {
        id: 'home',
        index: true,
        component: HomePage,
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: { type: 'string', optional: true },
        },
        hash: { type: 'enum', values: ['profile', 'settings', 'security'], optional: true },
        component: UserPage,
        meta: {
          title: 'User',
          requiresAuth: true,
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

await router.resolveCurrent();

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} fallback={<h1>Not found</h1>} />,
);
```

`resolveCurrent()` resolves the initial browser URL before the first render. This matters for route redirects, canonical trailing-slash cleanup, middleware redirects, and SSR-style hydration data.

## Generate contracts

Add scripts to `package.json`.

```json
{
  "scripts": {
    "generate:routes": "cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router",
    "validate:routes": "cookbook-router validate --routes src/routes.tsx"
  }
}
```

Run generation:

```sh
pnpm generate:routes
```

Add the generated files to `tsconfig.json`.

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

After registration, route IDs, URLKit-parsed params, search fields, hash values, metadata, and paths are inferred through the public package types. `{id:int}` is `number`; custom constraints remain `string`.

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

The two-argument form is also supported:

```ts
await navigate.to('users.show', {
  params: { id: 42 },
});
```

## Add a not-found fallback

The simplest fallback is provider-level:

```tsx
<RouterProvider router={router} fallback={<h1>Not found</h1>} />
```

For section-specific not-found UI, define an explicit catch-all child route inside that section. This preserves the section layout while keeping not-found behavior inside normal route matching.

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
- Read [React integration](react-integration.md) for components and hooks.
- Read [Code generation](codegen.md) and [Contracts](contracts.md) for generated typing.
- Read [SSR](ssr.md) for server rendering and hydration.
