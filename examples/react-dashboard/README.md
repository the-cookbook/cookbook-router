# React dashboard example

`examples/react-dashboard` is a production-style dashboard app that uses Cookbook Router with React, generated route contracts, layout slots, custom path constraints, search params, and configured route interception.

## What it demonstrates

- A shell layout shared by overview, users, reports, and create pages.
- Layout slots for route-specific headers and modal rendering.
- Automatic configured interception from `/overview` to `/create` through the `modal` slot.
- Canonical direct rendering of `/create` as a full page.
- Generated contracts from `app/routes.ts`.
- A custom `slug` path constraint used by `/users/{slug:slug}`.
- Search params on `/overview?visitors=...`.
- `NavLink` matching that keeps the overview item active while ignoring search params.
- A not-found redirect for missing user detail records.

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

The unit tests cover entry redirects, search-preserving active navigation, automatic modal interception, canonical full-page rendering, custom slug params, missing-record redirects, and generated contract inference.

## Route model

```txt
/                  -> redirects to /overview
/overview          -> dashboard overview
/create            -> canonical create page
/users             -> users index
/users/{slug:slug} -> user details
/reports           -> reports dashboard
/not-found         -> not found page
```

The `/overview` route owns this configured intercept:

```ts
intercepts: {
  modal: {
    to: ['/create'],
    component: OverviewCreateModal,
  },
}
```

Client navigation from `/overview` to `/create` opens the create modal and preserves the overview branch. Direct visits to `/create` render the canonical create page.
