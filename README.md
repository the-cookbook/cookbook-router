# Cookbook Router

> **Status:** Cookbook Router is currently under active development. APIs, generated contracts, and route manifest formats may change before a stable release.

Cookbook Router is a typed, SSR-ready routing framework backed by `@cookbook/urlkit` for URL state and `@cookbook/pathkit` beneath URLKit for path-pattern primitives. The repository contains a framework-agnostic runtime, React bindings, and a CLI that generates TypeScript contracts and route manifests from static route definitions.

**Live Example**: [https://the-cookbook.github.io/cookbook-router/overview](https://the-cookbook.github.io/cookbook-router/overview)

**API documentation**: [https://the-cookbook.github.io/cookbook-router-docs/](https://the-cookbook.github.io/cookbook-router-docs/)

## Table of contents

- [Motivation](#motivation)
- [Packages](#packages)
- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Custom path constraints](#custom-path-constraints)
- [Generate contracts](#generate-contracts)
- [Core concepts](#core-concepts)
- [Examples](#examples)
- [Repository scripts](#repository-scripts)
- [Git hooks](#git-hooks)
- [Release workflow](#release-workflow)
- [Documentation](#documentation)
- [Documentation map](#documentation-map)
- [Development notes](#development-notes)

## Motivation

Most modern routing solutions work well for common application flows, but many have moved toward file-system routing as the primary architecture. That approach is convenient at the start of a project, but it can also make routes too dependent on folder structure, reduce architectural freedom, and make large applications harder to organize around product domains, permissions, layouts, data ownership, or business workflows.

Cookbook Router takes a route-definition-first approach. Routes are declared explicitly, with stable route IDs, typed navigation, generated contracts, middleware, layouts, slots, intercepts, redirects, SSR support, and validation built into the routing layer. The URL structure remains fully under your control without forcing the application architecture to mirror the filesystem.

A key difference is path parameter validation. Many routers match dynamic segments but leave validation to page components, loaders, or application code. Cookbook Router validates route params at the routing boundary through path constraints, so invalid URLs fail naturally into not-found behavior before they reach business logic. This reduces defensive checks inside screens and makes route validity part of the route contract.

Modern applications also need middleware for authentication, authorization, redirects, rewrites, guards, analytics, and request-like navigation control. Cookbook Router supports middleware as a first-class routing primitive, including route-level middleware and provider-level middleware for React applications. That keeps cross-cutting navigation rules close to the router instead of scattering them across pages, effects, or layout components.

The goal is not to replace framework conventions with more ceremony. The goal is to provide a routing model that scales with application complexity while preserving developer choice:

- define routes where they best fit your architecture;
- navigate by stable route IDs instead of fragile path strings;
- validate URL params before rendering business screens;
- centralize navigation rules with middleware;
- support advanced UI patterns such as layouts, slots, and intercepts;
- keep SSR, generated contracts, and runtime behavior aligned.

Cookbook Router is designed for teams that want the type safety and structure of modern routers without giving up control over how their application is organized.

## Packages

| Package                  | Purpose                                                                                                                                                                     | Package docs                              | API reference                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `@cookbook/router`       | Route definitions, validation, normalization, matching, href generation, middleware, lifecycle, SSR, histories, slots, intercepts, redirects, and generated contract types. | [README](packages/router/README.md)       | [API](docs/api.md#cookbookrouter)       |
| `@cookbook/router-react` | React provider, links, nav links, outlets, slots, hooks, outlet context, unload blockers, and static rendering integration.                                                 | [README](packages/router-react/README.md) | [API](docs/api.md#cookbookrouter-react) |
| `@cookbook/router-cli`   | Contract generation, manifest generation, route validation, static route extraction, watch mode, and programmatic generation APIs.                                          | [README](packages/router-cli/README.md)   | [API](docs/api.md#cookbookrouter-cli)   |

The root package does not expose runtime APIs. Use package-root imports from the packages above and avoid deep imports from `src` or `dist`.

## Requirements

- Node.js `>=18`
- pnpm `>=9.0.0`
- React apps must provide `react` and `react-dom` `>=18`

## Install

```sh
pnpm add @cookbook/router
pnpm add @cookbook/router-react react react-dom
pnpm add -D @cookbook/router-cli
```

For non-React usage, install only `@cookbook/router`. `@cookbook/urlkit` and `@cookbook/pathkit` are installed transitively by `@cookbook/router`.

## Quick start

Define routes with stable route IDs. Use `component` for page components and `layout.component` for layout wrappers.

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
        hash: { type: 'enum', values: ['profile', 'settings'], optional: true },
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

Create and render a router.

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

Navigate by route ID.

```tsx
import { Link, useParams } from '@cookbook/router-react';

export function UserLink() {
  return (
    <Link to="users.show" params={{ id: 42 }} search={{ tab: 'settings' }} hash="profile">
      Open user
    </Link>
  );
}

export function UserPage() {
  const params = useParams('users.show');
  // params.id is number because `{id:int}` is parsed by URLKit.
  return <h1>User {params.id}</h1>;
}
```

## Custom path constraints

`@cookbook/router` re-exports `@cookbook/pathkit`'s `createConstraint()`. Register custom constraints in `defineRoutes(..., { pathConstraints })` when route definitions use custom constraint names, because the router forwards those constraints to URLKit before validation and URL contract compilation.

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

const routes = defineRoutes([{ id: 'posts.show', path: '/posts/{slug:slug}' }] as const, {
  pathConstraints: { slug },
});

export const router = createRouter({
  routes,
});
```

`defineRoutes(..., { pathConstraints })` registers constraints before immediate route validation. `createRouter({ pathConstraints })` is still supported for route arrays that have not already been validated. For SSR, use the same constraint setup on the server and client.

## Generate contracts

The CLI reads statically analyzable route definitions and generates contract files used for route ID, parsed params, parsed search, parsed hash, metadata, and path inference.

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

Generated files:

```txt
.cookbook-router/
  contracts.ts
  register.d.ts
  manifest.json
```

Include the generated files in your TypeScript program:

```json
{
  "include": ["src", ".cookbook-router/contracts.ts", ".cookbook-router/register.d.ts"]
}
```

## Core concepts

- **Route IDs are the public navigation API.** Paths declare URL matching; route IDs drive links, programmatic navigation, href generation, redirects, and type inference.
- **URL state is URLKit-backed.** URLKit owns path param parsing, search/hash parsing and building, URL normalization, matching, and href construction. Cookbook Router owns route IDs, route trees, middleware, lifecycle, redirects, slots, intercepts, histories, React rendering, and CLI workflows.
- **Built-in numeric params are numbers.** `{id:int}`, `{price:decimal}` and `{value:range(1,10)}` parse to `number` in router state, React hooks, middleware, lifecycle, and generated contracts. Custom constraints remain `string` unless URLKit adds typed static inference for them.
- **Search and hash are parsed through URLKit.** Static descriptors such as `{ type: 'int', default: 1 }`, `{ type: 'string', many: true }`, `{ type: 'date', format: 'dd-MM-yyyy' }`, `{ type: 'date-time', format: "dd-MM-yyyy'T'HH:mm:ss'Z'" }`, and object hash descriptors drive parsed runtime state and generated contracts. Date/date-time fields are UTC; use `toISOString()` or UTC getters when asserting parsed `Date` values.
- **URL options are configurable.** `url.arrayFormat` and build-time `url.defaults` can be configured on the router, on a route, or per build call/hook/component. `url.invalidSearch` and `url.invalidHash` control whether malformed URL state recovers, rejects the route as a no-match, or becomes route error state. Precedence is per-call, then route-level, then router-level, then URLKit defaults.
- **Layouts render child routes through `<Outlet />`.** Layout slots render parallel UI regions through `<Slot name="..." />`.
- **Intercepts preserve the current branch while rendering a destination into a slot.** Direct visits to the same destination URL render the canonical full page.
- **Route redirects are first-class.** Use `redirect: { route: 'target' }` for internal route redirects and `redirect: 'https://example.com'` for external redirects.
- **SSR uses static routers.** Server code uses `createStaticRouter()`, `StaticRouterProvider`, and serialized router state for hydration.

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

## Repository scripts

| Command                 | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `pnpm build:packages`   | Build all packages.                                          |
| `pnpm build:examples`   | Typecheck and build all examples.                            |
| `pnpm test`             | Run package tests.                                           |
| `pnpm test:examples`    | Run example tests.                                           |
| `pnpm test:e2e`         | Run repository-level E2E tests.                              |
| `pnpm typecheck:all`    | Typecheck packages and examples.                             |
| `pnpm validate:release` | Run release readiness checks.                                |
| `pnpm hooks:pre-commit` | Run the same validation used by the pre-commit hook.         |
| `pnpm hooks:pre-push`   | Run the same validation used by the pre-push hook.           |
| `pnpm changeset`        | Create a release note and version bump intent.               |
| `pnpm version-packages` | Apply pending changesets to package versions and changelogs. |
| `pnpm release`          | Validate and publish packages with Changesets.               |

## Git hooks

Husky installs Git hooks through the root `prepare` script after `pnpm install`. The pre-commit hook uses `lint-staged` so ESLint and Prettier run only against staged files. The hooks call visible package scripts instead of hiding logic inside shell files.

| Hook         | Script                  | Purpose                                                                |
| ------------ | ----------------------- | ---------------------------------------------------------------------- |
| `pre-commit` | `pnpm hooks:pre-commit` | Staged-file lint/format checks, docs API validation, and blocker scan. |
| `pre-push`   | `pnpm hooks:pre-push`   | Full `pnpm test:ci` validation before pushing.                         |

See [Git hooks](docs/git-hooks.md) for setup, skipping, and troubleshooting.

For day-to-day contribution workflow, including when to add changesets during development, see [Developing](docs/developing.md).

## Release workflow

Releases use Changesets. Add a changeset for user-visible package changes, validate with `pnpm test:ci`, let `pnpm version-packages` apply pending changesets to versions and changelogs, then publish with `pnpm release`.

See [Releasing](docs/releasing.md) for the full maintainer workflow, release gates, and common failure fixes.

## Documentation

- [Getting started](docs/getting-started.md)
- [Core API reference](docs/api.md)
- [Routing](docs/routing.md)
- [Navigation](docs/navigation.md)
- [React integration](docs/react-integration.md)
- [Contracts](docs/contracts.md)
- [Code generation](docs/codegen.md)
- [Search and hash](docs/search-and-hash.md)
- [Middleware](docs/middleware.md)
- [Lifecycle](docs/lifecycle.md)
- [SSR](docs/ssr.md)
- [Examples guide](docs/examples.md)
- [Testing](docs/testing.md)
- [Developing](docs/developing.md)
- [Git hooks](docs/git-hooks.md)
- [Releasing](docs/releasing.md)
- [Troubleshooting](docs/troubleshooting.md)

## Documentation map

| Need                           | Start here                                 | Then read                                                                                                       |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Build a first React app        | [Getting started](docs/getting-started.md) | [React integration](docs/react-integration.md), [Navigation](docs/navigation.md)                                |
| Understand route configuration | [Routing](docs/routing.md)                 | [Search and hash](docs/search-and-hash.md), [Middleware](docs/middleware.md), [Lifecycle](docs/lifecycle.md)    |
| Use generated route types      | [Code generation](docs/codegen.md)         | [Contracts](docs/contracts.md), [API reference](docs/api.md#contract-registration)                              |
| Render on the server           | [SSR](docs/ssr.md)                         | [React integration](docs/react-integration.md#static-provider), [API reference](docs/api.md#serialization-apis) |
| Debug a failing route          | [Troubleshooting](docs/troubleshooting.md) | [Testing](docs/testing.md), [API reference](docs/api.md)                                                        |
| Contribute to the repo         | [Developing](docs/developing.md)           | [Contributing](CONTRIBUTING.md), [Git hooks](docs/git-hooks.md), [Releasing](docs/releasing.md)                 |

## Development notes

- Tests for package source live next to the source file they cover.
- Generated files under `.cookbook-router/` should be regenerated after route definition changes. Route definitions consumed by the CLI must stay statically analyzable; use static `path`, `search`, `hash`, and `url` descriptors rather than URLKit runtime builders.
- Build package outputs before running examples against recently changed package code: `pnpm build:packages`.
- Do not deep import from package internals; public APIs are exported from package roots.
