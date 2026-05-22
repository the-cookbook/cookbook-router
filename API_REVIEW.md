# Phase 10 API Review

This pass kept the existing public surface compatible while reducing consumer boilerplate and tightening diagnostics.

## Table of contents

- [Public API improvements](#public-api-improvements)
- [Type inference improvements](#type-inference-improvements)
- [Diagnostics improvements](#diagnostics-improvements)
- [Tree-shaking and exports](#tree-shaking-and-exports)

## Public API improvements

- `router.href()` and `router.resolve()` accept either the existing `(routeId, options)` form or a single object target: `router.href({ route, params, search, hash })`.
- `router.navigate.to()` and `router.navigate.replace()` accept the same object target while preserving the existing two-argument form.
- `Link` and `NavLink` support `to` as an alias for `route`; `route` remains supported.
- `useHref()` supports both existing arguments and object targets.
- `createStaticRouter()` accepts `url`, `URL`, `Request`, or `request` for lower-friction SSR usage.

## Type inference improvements

- Added `RouteUrlOptions<Route>` for reusable typed params/search/hash option bags.
- Added `RouteHashInput<Route>` so typed hash values can be passed with or without a leading `#`.
- Added `RouteOutletContext<Route>` for route-aware outlet context typing.
- Unknown or unregistered runtime route strings remain usable with broad option records, while generated contracts still narrow known route IDs.
- Generated contracts emit `routeIds` and `routePaths` constants for route discovery.

## Diagnostics improvements

- Added shared router diagnostic helpers with route IDs, param names, path tokens, and actionable recovery hints.
- React provider and outlet-context failures use consistent messages.
- Href generation failures distinguish unknown route IDs, pathless routes, missing params, invalid params, and generated path mismatches.

## Tree-shaking and exports

- Diagnostics are exported from the root package to avoid extra bundle entry points while preserving tree-shaking.
- Package `sideEffects: false` remains intact.
