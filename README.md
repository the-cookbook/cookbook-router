# Cookbook Router

> **Status:** Cookbook Router is currently under active development. APIs, generated contracts, and route manifest formats may change before a stable release.

Cookbook Router is a typed, SSR-ready routing framework built on top of `@cookbook/pathkit`. The repository contains a framework-agnostic runtime, React bindings, and a CLI that generates TypeScript contracts and route manifests from route definitions.

Live Example: [https://the-cookbook.github.io/cookbook-router/overview](https://the-cookbook.github.io/cookbook-router/overview)

## Table of contents

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

For non-React usage, install only `@cookbook/router`. `@cookbook/pathkit` is installed transitively by `@cookbook/router`.

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
          tab: 'string',
        },
        hash: ['profile', 'settings'],
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
    <Link to="users.show" params={{ id: '42' }} search={{ tab: 'settings' }} hash="profile">
      Open user
    </Link>
  );
}

export function UserPage() {
  const params = useParams('users.show');
  return <h1>User {params.id}</h1>;
}
```

## Custom path constraints

`@cookbook/router` re-exports `@cookbook/pathkit`'s `createConstraint()`. Register custom constraints in `defineRoutes(..., { pathConstraints })` when route definitions use custom constraint names, because `defineRoutes()` validates immediately.

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

The CLI reads route definitions and generates contract files used for route ID, params, search, hash, metadata, and path inference.

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
- **Path params are strings.** Constraints such as `{id:int}` validate URL shape but generated param values are typed as `string`.
- **Search schemas drive generated optional fields.** Runtime parsing is URL-faithful: one query key occurrence becomes a string, repeated occurrences become `readonly string[]`. Descriptors are not runtime validators.
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
- Generated files under `.cookbook-router/` should be regenerated after route definition changes.
- Build package outputs before running examples against recently changed package code: `pnpm build:packages`.
- Do not deep import from package internals; public APIs are exported from package roots.
