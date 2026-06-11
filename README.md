# Cookbook Router

**Define routes once. Trust them everywhere.**

<div align="center">
  <img src="/assets/harpy.png" alt="Centered Image" style="width:420px;" />
</div>

Cookbook Router is a strongly typed, framework-agnostic router that turns route declarations into shared contracts for matching, links, redirects, middleware, rendering traversal, SSR, React integration, and generated TypeScript types.

URL params, search params, and hash state are parsed and validated before they reach your pages, so application code works with checked, typed route data instead of raw URL strings.

Beyond matching URLs to views, Cookbook Router gives you routing primitives for real application flows: middleware and lifecycle hooks for authorization, redirects, analytics, audit trails, and logging; layouts and slots for structured screens; and intercepts for route-driven modals, previews, and split-view experiences.

Not string-driven. Not filesystem-bound. Contract-first routing.

> **Status:** Cookbook Router is currently under active development. APIs, generated contracts, and route manifest formats may change before a stable release.

**Live example:** https://the-cookbook.github.io/cookbook-router/overview

**API documentation:** https://the-cookbook.github.io/cookbook-router-docs/

---

## Table of Contents

- [Cookbook Router](#cookbook-router)
  - [Why Cookbook Router?](#why-cookbook-router)
  - [Routes: convention, strings, or contracts?](#routes-convention-strings-or-contracts)
  - [Packages](#packages)
  - [Requirements](#requirements)
  - [Install what you need](#install-what-you-need)
    - [1.a. Core Router](#1a-core-router)
    - [1.b. React Integration](#1b-react-integration)
    - [2. CLI](#2-cli)
  - [Quick start](#quick-start)
    - [1. Declare the routes](#1-declare-the-routes)
    - [2.a. Create the router: framework-agnostic](#2a-create-the-router-framework-agnostic)
    - [2.b. Using React? Add the React integration](#2b-using-react-add-the-react-integration)
    - [3. Build URLs from the contract](#3-build-urls-from-the-contract)
    - [4. Generate contracts](#4-generate-contracts)
  - [Generate route contracts](#generate-route-contracts)
    - [What gets generated](#what-gets-generated)
    - [Recommended scripts](#recommended-scripts)
    - [Keep route files static](#keep-route-files-static)
  - [Core concepts](#core-concepts)
  - [Common patterns](#common-patterns)
    - [Protect before render](#protect-before-render)
    - [Track navigation where it happens](#track-navigation-where-it-happens)
    - [Keep screen structure in the route tree](#keep-screen-structure-in-the-route-tree)
    - [Make modals routable](#make-modals-routable)
  - [Custom path constraints](#custom-path-constraints)
  - [Examples](#examples)
  - [Documentation](#documentation)

---

## Why Cookbook Router?

Most routers match URLs. Cookbook Router makes routes matter.

In real applications, a route is not just a path. It is validation, navigation, authorization, redirects, analytics, layout, UI flow, SSR state, and type safety.

When those rules are scattered across strings, folders, page components, effects, loaders, and guards, your routing model becomes invisible. And invisible architecture always gets expensive.

With Cookbook Router, a route does not just point to a page. It checks the input, enforces the rules, coordinates the flow, and sends every request where it belongs.

One route. One contract. No guesswork.

## Routes: convention, strings, or contracts?

Every router chooses where the truth lives.

| Routing model            | Where the truth lives             | The tradeoff                                                                                                                                                          |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filesystem routing       | In folders.                       | Fast to start. Expensive when product structure, permissions, layouts, and workflows stop looking like a file tree.                                                   |
| String-based routing     | Everywhere.                       | Flexible until paths spread through links, redirects, tests, guards, and page code. Then every refactor becomes archaeology.                                          |
| Component-first routing  | In the UI.                        | Natural for rendering. Messy when validation, authorization, redirects, analytics, and lifecycle rules start living beside components.                                |
| Typed route-tree routing | In route structure and inference. | Safer navigation, but often shaped by a specific framework, runtime, or rendering model.                                                                              |
| Cookbook Router          | In route contracts.               | Routes validate URL state, build links, run middleware, coordinate lifecycle, shape layouts and slots, support intercepts and SSR, and generate TypeScript contracts. |

Folders are conventions. Strings are liabilities. Views are not traffic cops.

Cookbook Router treats routes as contracts: validate the input, run the rules, and send every request where it belongs.

## Packages

| Package                  | Purpose                                                                                                                                                                                                 | Package docs                              | API reference                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `@cookbook/router`       | Route definitions, validation, normalization, matching, href generation, middleware, lifecycle, SSR, histories, slots, intercepts, redirects, renderer-neutral traversal, and generated contract types. | [README](packages/router/README.md)       | [API](docs/api.md#cookbookrouter)       |
| `@cookbook/router-react` | React provider, links, nav links, outlets, slots, hooks, outlet context, unload blockers, and static rendering integration.                                                                             | [README](packages/router-react/README.md) | [API](docs/api.md#cookbookrouter-react) |
| `@cookbook/router-cli`   | Contract generation, manifest generation, route validation, static route extraction, watch mode, and programmatic generation APIs.                                                                      | [README](packages/router-cli/README.md)   | [API](docs/api.md#cookbookrouter-cli)   |

The root package does not expose runtime APIs. Use package-root imports from the packages above and avoid deep imports from `src` or `dist`.

## Requirements

- Node.js `>=18`
- React apps must provide `react` and `react-dom` `>=18`

## Install what you need

### 1.a. Core Router

Use the core router in any JavaScript or TypeScript application that needs framework-agnostic routing.

```sh
pnpm add @cookbook/router

npm install @cookbook/router

yarn add @cookbook/router
```

### 1.b. React Integration

Use the React integration for applications built with React.

```sh
pnpm add @cookbook/router @cookbook/router-react

npm install @cookbook/router @cookbook/router-react

yarn add @cookbook/router @cookbook/router-react
```

### 2. CLI

Use the CLI when you want to generate route contracts, generate route manifests, validate route files, or run those checks in CI.

```sh
pnpm add -D @cookbook/router-cli

npm install -D @cookbook/router-cli

yarn add -D @cookbook/router-cli
```

Use this. It keeps the punch, keeps the monorepo story, uses `view`, uses a catch-all route, and does **not** reduce Quick start back into boring docs.

## Quick start

Start with the contract. Rendering comes after.

### 1. Declare the routes

```tsx
import { defineRoutes } from '@cookbook/router';
import { HomePage, NotFoundPage, RootLayout, UserPage } from './pages';

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
          tab: {
            type: 'enum',
            values: ['profile', 'settings'],
            default: 'profile',
          },
        },
        hash: {
          type: 'enum',
          values: ['profile', 'settings'],
          optional: true,
        },
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

One declaration. Path matched. URL checked. Metadata carried. Layout shaped. Not-found handled.

### 2.a. Create the router: framework-agnostic

No UI framework required.

```ts
import { createRouter } from '@cookbook/router';
import { routes } from './routes';

export const router = createRouter({
  routes,
});

await router.start();
```

### 2.b. Using React? Add the React integration

```tsx
import { Link, RouterProvider, useParams, useSearchParams } from '@cookbook/router-react';
import { router } from './router';

export function App() {
  return <RouterProvider router={router} />;
}

export function UserLink() {
  return (
    <Link to="users.show" params={{ id: 42 }} search={{ tab: 'settings' }} hash="profile">
      Open user
    </Link>
  );
}

export function UserPage() {
  const params = useParams('users.show');
  const search = useSearchParams('users.show');

  // params.id: number
  // search.tab: 'profile' | 'settings'

  return (
    <h1>
      User {params.id}: {search.tab}
    </h1>
  );
}
```

### 3. Build URLs from the contract

No hand-written paths.

```ts
const href = router.href('users.show', {
  params: { id: 42 },
  search: { tab: 'settings' },
  hash: 'profile',
});

// /users/42?tab=settings#profile
```

### 4. Generate contracts

Make TypeScript enforce the routing.

```sh
cookbook-router generate --routes src/routes.ts --out-dir .cookbook-router
```

Add the generated files to your `tsconfig.json` file.

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

Generate the files. Register the contract. Let TypeScript do its job.

One route declaration. Core runtime. React integration. Generated contracts.

## Generate route contracts

Runtime validation protects the page. Generated contracts protect the codebase.

Use `@cookbook/router-cli` to generate TypeScript contracts, route registration, and a manifest from your route declarations.

```sh
cookbook-router generate --routes src/routes.ts --out-dir .cookbook-router
```

The CLI writes:

```txt
.cookbook-router/
  contracts.ts
  register.d.ts
  manifest.json
```

Add the generated directory to your TypeScript program.

```json
{
  "include": ["src", ".cookbook-router"]
}
```

Generate the files. Register the contracts. Let TypeScript do its job.

### What gets generated

| File            | Purpose                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `contracts.ts`  | Route IDs, paths, params, search, hash, metadata, outlet context, and router contract types.   |
| `register.d.ts` | Registers generated contracts through `@cookbook/router` module augmentation.                  |
| `manifest.json` | Tooling-friendly route manifest with route IDs, paths, hierarchy, and route-level URL options. |

### Recommended scripts

```json
{
  "scripts": {
    "router:generate": "cookbook-router generate --routes src/routes.ts --out-dir .cookbook-router",
    "router:watch": "cookbook-router generate --routes src/routes.ts --out-dir .cookbook-router --watch",
    "router:validate": "cookbook-router validate --routes src/routes.ts",
    "typecheck": "pnpm router:generate && tsc --noEmit"
  }
}
```

Use `validate` in CI when you want route validation without writing files.

```sh
cookbook-router validate --routes src/routes.ts
```

Use `--watch` during development.

```sh
cookbook-router generate --routes src/routes.ts --out-dir .cookbook-router --watch
```

The shorter `cbr` binary is also available.

```sh
cbr generate --routes src/routes.ts --out-dir .cookbook-router
```

### Keep route files static

The CLI is a static extractor. Give it route data, not a puzzle.

**Good**:

```ts
export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{id:int}',
    search: {
      page: { type: 'int', default: 1 },
      tags: { type: 'string', many: true, optional: true },
    },
    hash: {
      type: 'enum',
      values: ['details', 'reviews'],
      optional: true,
    },
    meta: {
      title: 'Product',
    },
  },
] as const);
```

**Bad**:

```ts
const productRouteId = 'products.show';
const productPath = `/products/{id:int}`;

const productSearch = {
  page: { type: 'int', default: 1 },
  tags: { type: 'string', many: true, optional: true },
};

const productMeta = {
  title: 'Product',
};

export const routes = defineRoutes([
  {
    id: productRouteId,
    path: productPath,
    search: productSearch,
    meta: {
      ...productMeta,
    },
  },
] as const);
```

Keep codegen-relevant fields inline: `id`, `path`, `index`, `search`, `hash`, `meta`, `children`, `layout.slots`, and `redirect`.

Static route files are not a limitation. They are the deal: one route declaration that runtime, tooling, and TypeScript can all understand.

## Core concepts

Cookbook Router has one operating rule: the route declaration is the contract.

| Concept             | What it owns                                                                                        | What it prevents                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Route IDs           | Links, redirects, hrefs, and navigation calls.                                                      | Hard-coded paths hiding across the app.                        |
| URL validation      | Path params, search params, and hash state before they reach views, middleware, or lifecycle hooks. | Pages defending themselves from malformed URLs.                |
| Views               | Route-owned view references. Rendering is handled by integrations such as `@cookbook/router-react`. | Coupling the core router to one UI framework.                  |
| Middleware          | Auth, redirects, guards, audit, logging, and request-like navigation control.                       | Rules fragmented across pages, effects, and layout components. |
| Lifecycle hooks     | Transition side effects such as analytics, instrumentation, and route tracking.                     | Navigation behavior becoming invisible side effects.           |
| Layouts and slots   | Route-owned screen structure and named rendering regions.                                           | UI composition turning into component improvisation.           |
| Intercepts          | Route-driven modals, previews, drawers, and split-view destinations.                                | Modal state pretending it is not routing.                      |
| SSR state           | Static route resolution and serialized router state for hydration.                                  | Server and client disagreeing about the route.                 |
| Generated contracts | Route IDs, params, search, hash, metadata, hrefs, and manifests.                                    | TypeScript guessing what the router already knows.             |

Paths match. IDs navigate. Contracts enforce.

URL shape belongs to the path. Application intent belongs to the route ID. Routing behavior belongs to the declaration.

## Common patterns

Routes should own routing behavior. Pages should not clean up after them.

| Pattern             | Put it in the route when                                                                 | Use                             |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| Protected routes    | Access must be checked before the view renders.                                          | `middleware`, `meta`            |
| Redirects           | A URL should move somewhere else by rule, not by component effect.                       | `redirect`, `middleware`        |
| Analytics and audit | Navigation should be measured where navigation happens.                                  | `lifecycle`                     |
| Shared shells       | A section needs persistent structure around child routes.                                | `layout.view`, `<Outlet />`     |
| Parallel regions    | A screen needs owned regions like sidebars, panels, or modals.                           | `layout.slots`, `<Slot />`      |
| Route-driven modals | A destination should open as a modal from one route and as a page when visited directly. | `intercepts`                    |
| Section not-found   | Unknown child URLs should keep the section layout active.                                | catch-all child route           |
| SSR                 | Server and client must agree before hydration starts.                                    | static router, serialized state |

### Protect before render

```tsx
{
  id: 'admin',
  path: '/admin',
  view: AdminPage,
  meta: {
    requiresAuth: true,
  },
  middleware: [requireAuth],
}
```

No page-level permission theater. The route checks first.

### Track navigation where it happens

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  view: DashboardPage,
  lifecycle: {
    afterEnter: ({ location }) => {
      analytics.page(location.href);
    },
    onError: (error, { location }) => {
      logger.error(error, { href: location.href });
    },
  },
}
```

Analytics in effects is cleanup. Analytics in lifecycle is architecture.

### Keep screen structure in the route tree

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    view: DashboardLayout,
    slots: {
      sidebar: {
        view: DashboardSidebar,
      },
      modal: true,
    },
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

The layout, the slots, and the not-found behavior live with the route that owns them.

### Make modals routable

```tsx
{
  id: 'gallery',
  path: '/gallery',
  layout: {
    view: GalleryLayout,
    slots: {
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: 'photos.show',
      view: PhotoModal,
    },
  },
  children: [
    {
      id: 'gallery.index',
      index: true,
      view: GalleryIndexPage,
    },
  ],
},
{
  id: 'photos.show',
  path: '/photos/{id:int}',
  view: PhotoPage,
}
```

```tsx
<Link to="photos.show" params={{ id: 42 }}>
  Preview photo
</Link>
```

From the gallery, it is a modal. Direct visit, refresh, or share the URL, and it is the page.

Modal state is routing state. Stop hiding it in components.

## Custom path constraints

Some parameters are not just parameters. They carry the rules of your business: the slug that must look like a slug, the locale that must speak the right language, the tenant that must identify the right customer, the product code that must not be guessed. For those cases, use custom path constraints.

### Create a constraint

```ts
import { createConstraint, createRouter, defineRoutes } from '@cookbook/router';

const slug = createConstraint({
  parse: (paramName, value) => {
    if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
      throw new Error(`Parameter "${paramName}" must be a valid slug.`);
    }
  },
  verify: (_paramName, params) => {
    if (params) {
      throw new Error('slug does not accept parameters.');
    }
  },
  toRegExp: () => '[a-z0-9-]+',
});
```

### Register it with route validation

`defineRoutes()` validates immediately, so constraints must be provided before the route path uses them.

```ts
const routes = defineRoutes([{ id: 'posts.show', path: '/posts/{slug:slug}' }] as const, {
  pathConstraints: { slug },
});
```

Custom constraints generate `string` params unless the same constraint chain also includes a numeric built-in constraint such as `int`, `decimal`, `range`, `min`, or `max`.

## Examples

| Example                     | Shows                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `examples/react-basic`      | Typed params, search, hash, middleware, lifecycle, and generated contracts.                                   |
| `examples/react-slots`      | Layout slots, slot fallbacks, slot routes, disabled slots, and outlet context.                                |
| `examples/react-intercepts` | Configured and call-site route interception.                                                                  |
| `examples/react-blog`       | Real-world blog routing, protected area, login redirect, slots, search, archive, and modal article previews.  |
| `examples/react-dashboard`  | Dashboard shell, header slots, search-driven nav matching, custom constraints, and create modal interception. |
| `examples/react-ssr`        | Static router SSR, hydration data, and Vite dev SSR.                                                          |

Run an example:

```sh
pnpm install
pnpm build:packages
pnpm --filter react-blog dev
pnpm --filter react-dashboard dev
```

## Documentation

| Need                              | Start here                                     | Then read                                                                                                       |
| --------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Start with Cookbook Router        | [Getting started](docs/getting-started.md)     | [Routing](docs/routing.md), [Navigation](docs/navigation.md), [Search and hash](docs/search-and-hash.md)        |
| Use React                         | [React integration](docs/react-integration.md) | [Getting started](docs/getting-started.md), [Examples guide](docs/examples.md)                                  |
| Define route contracts            | [Routing](docs/routing.md)                     | [Contracts](docs/contracts.md), [Code generation](docs/codegen.md), [API reference](docs/api.md)                |
| Generate route types              | [Code generation](docs/codegen.md)             | [Contracts](docs/contracts.md), [API reference](docs/api.md#contract-registration)                              |
| Add middleware or lifecycle hooks | [Middleware](docs/middleware.md)               | [Lifecycle](docs/lifecycle.md), [Troubleshooting](docs/troubleshooting.md)                                      |
| Render on the server              | [SSR](docs/ssr.md)                             | [React integration](docs/react-integration.md#static-provider), [API reference](docs/api.md#serialization-apis) |
| Test routing behavior             | [Testing](docs/testing.md)                     | [Troubleshooting](docs/troubleshooting.md), [API reference](docs/api.md)                                        |
| Debug a failing route             | [Troubleshooting](docs/troubleshooting.md)     | [Testing](docs/testing.md), [Route validation errors](docs/route-validation-errors.md)                          |
| Contribute to the repository      | [Developing](docs/developing.md)               | [Contributing](CONTRIBUTING.md), [Git hooks](docs/git-hooks.md), [Releasing](docs/releasing.md)                 |
