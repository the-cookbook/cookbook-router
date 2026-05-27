# Examples guide

The examples are executable documentation for common routing patterns. Each example has tests and type checks.

## Table of contents

- [Run examples](#run-examples)
- [`react-basic`](#react-basic)
- [`react-slots`](#react-slots)
- [`react-intercepts`](#react-intercepts)
- [`react-blog`](#react-blog)
- [`react-dashboard`](#react-dashboard)
- [`react-ssr`](#react-ssr)
- [When examples look stale](#when-examples-look-stale)

## Run examples

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm --filter react-blog dev
pnpm --filter react-dashboard dev
```

Build every example:

```sh
pnpm build:examples
```

Test every example:

```sh
pnpm test:examples
```

## `react-basic`

Shows:

- route params
- search params
- hash values
- middleware redirects
- lifecycle hooks
- generated contracts

Use this example when learning the minimal app setup.

## `react-slots`

Shows:

- layout slots
- slot fallbacks
- matched slot routes
- disabled inherited slots
- outlet and slot context
- entry redirect from `/` to `/dashboard`

Important modeling pattern: if `/dashboard/activity` has both primary content and sidebar content, define a primary route and a slot route. Navigate to the primary route.

## `react-intercepts`

Shows:

- configured intercepts
- call-site intercepts
- canonical full-page destination route
- modal slot rendering
- browser back/forward behavior

Use this example to understand the core purpose of intercepts: preserve the source UI while updating the URL to the destination.

## `react-blog`

Shows a fuller real-world app:

- blog home
- articles list
- search through query params
- article detail pages
- archive
- restricted members area
- login and logout with `redirect` search param
- sidebar and preview slots
- article modal interception
- canonical direct article pages
- styled responsive UI

This is the best example for content-heavy app-level architecture.

## `react-dashboard`

Shows a production-style dashboard app:

- shadcn-style dashboard shell
- async pages rendered through persistent layout loading states
- layout-level error fallback rendering through `/broken-page`
- route-specific header slots
- overview search params
- `NavLink` matching that ignores search params
- automatic configured modal interception from `/overview` to `/create`
- canonical direct `/create` page rendering
- custom `slug` path constraints for user detail routes
- missing-record redirects to `/not-found`
- generated contracts committed and covered by type tests
- testing patterns for delayed lazy routes and error boundaries

Use this example when validating dashboard-style layouts with persistent chrome, route-owned headers, layout loading/error states, modal create flows, and constrained detail routes.

## `react-ssr`

Shows:

- `createStaticRouter()`
- `StaticRouterProvider`
- serialized hydration state
- client hydration
- Vite dev SSR middleware
- server-included CSS

Use this example when wiring SSR into a framework or custom Vite server.

## When examples look stale

Examples import packages from the workspace. If you changed package source and an example still behaves like old code, rebuild package outputs:

```sh
pnpm build:packages
```

Then restart the example dev server.
