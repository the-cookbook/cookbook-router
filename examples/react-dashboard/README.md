# React dashboard example

`examples/react-dashboard` is a production-style dashboard app that uses Cookbook Router with React, generated route contracts, async route components, layout-level loading and error fallbacks, layout slots, custom path constraints, search params, middleware, and configured route interception.

## What it demonstrates

- Shared shell layout across the overview, users, reports, create, broken-page, and not-found demo routes.
- Async page components that suspend during navigation, making layout-level loading states easy to preview.
- `layout.loading` fallbacks rendered inside the shared layout outlet.
- `layout.error` boundaries rendered inside the shared layout when a child route throws.
- Route-specific layout slots for headers, sidebars, and modals.
- Configured route interception from `/overview` to `/create` through the `modal` slot.
- Configured route interception from any page to `/messages/new` through the `modal` slot.
- Custom sidebar rendering on `/reports`.
- Direct rendering of `/create` as a full page when visited directly.
- Generated TypeScript route contracts from `app/routes.ts`.
- Custom `slug` path constraint for `/users/{slug:slug}`.
- Search-param handling on `/overview?visitors=...`.
- `NavLink` matching that keeps the overview item active while ignoring search params.
- User-detail not-found handling for missing user records.
- Route error handling through the broken-page demo route.

## Run it

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm --filter react-dashboard dev
```

## Validate generated route contracts

```sh
pnpm --filter react-dashboard routes:generate
pnpm --filter react-dashboard routes:validate
```

The generated files live in `.cookbook-router/` and are committed so type inference can be tested without requiring a generation step first.

## Test it

```sh
pnpm --filter react-dashboard test
pnpm --filter react-dashboard typecheck
pnpm --filter react-dashboard build
```

The unit tests cover entry redirects, async layout loading behavior, search-preserving active navigation, automatic modal interception, canonical full-page rendering, custom slug params, missing-record redirects, broken-page error fallback rendering, and generated contract inference.

## Async loading and route errors

Dashboard pages are loaded with `React.lazy()` and an intentional delay so route-level async rendering is easy to see during development and tests. Each shell-backed route uses `layout.loading: LoadingSkeleton`, so the sidebar, header area, and layout chrome stay mounted while the route outlet shows the skeleton.

The `/broken-page` route intentionally throws from its page component:

```ts
{
  id: 'broken-page',
  path: '/broken-page',
  component: AsyncBrokenPage,
  layout: {
    component: LayoutPage,
    loading: LoadingSkeleton,
    error: ErrorPage,
  },
}
```

This demonstrates `layout.error`: the fallback is owned by the route layout and renders inside the same layout shell instead of replacing the whole application.

Because the example uses a delayed lazy import, tests that assert page body content use a timeout longer than `LAZY_PAGE_DELAY_MS`.

## Route model

```txt
/                           -> redirects to /overview
/overview                   -> dashboard overview
/create                     -> canonical create page
/users                      -> users index
/users/{slug:slug}          -> user details
/reports                    -> reports dashboard
/broken-page                -> intentionally throwing route rendered through layout.error
/login                      -> login page
/policies/terms-of-service  -> fake terms of service page
/policies/privacy-policy    -> fake privacy policy page
/*                          -> not found page
```

The `/overview` route owns this configured intercept:

```ts
intercepts: {
  modal: {
    to: 'create',
    component: OverviewCreateModal,
  },
}
```

Client navigation from `/overview` to `/create` opens the create modal and preserves the overview branch. Direct visits to `/create` render the canonical create page.
