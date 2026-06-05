# Examples guide

The examples are executable documentation for common routing patterns. Each example has tests and type checks, and they use URLKit-backed parsed params/search/hash behavior.

## Table of contents

- [Run examples](#run-examples)
- [`react-basic`](#react-basic)
- [`react-slots`](#react-slots)
- [`react-intercepts`](#react-intercepts)
- [`react-blog`](#react-blog)
- [`react-ssr`](#react-ssr)
- [When examples look stale](#when-examples-look-stale)

## Run examples

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm --filter react-blog dev
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

- URLKit-parsed route params, including numeric `{id:int}` values
- URLKit-parsed search params
- URLKit-parsed hash values
- router, route, and URL-building call-site `arrayFormat` behavior
- middleware redirects
- lifecycle hooks
- generated contracts

Use this example when learning the minimal app setup and URL option precedence.

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
- numeric `{id:int}` params in intercepted destinations
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
- login and logout with URLKit-parsed `redirect` search param
- sidebar and preview slots
- article modal interception
- canonical direct article pages
- styled responsive UI

This is the best example for app-level architecture.

## `react-ssr`

Shows:

- `createStaticRouter()`
- `StaticRouterProvider`
- serialized hydration state
- client hydration
- parsed numeric `{id:int}` params during SSR and hydration
- Vite dev SSR middleware
- server-included CSS

Use this example when wiring SSR into a framework or custom Vite server.

## When examples look stale

Examples import packages from the workspace. If you changed package source and an example still behaves like old code, rebuild package outputs:

```sh
pnpm build:packages
```

Then restart the example dev server.
