# Middleware

Middleware runs before navigation commits. Use it for access checks, redirects, rewrites, cancellation, and pre-navigation validation.

## Table of contents

- [Register middleware](#register-middleware)
- [Route-level middleware](#route-level-middleware)
- [Middleware context](#middleware-context)
- [Middleware results](#middleware-results)
- [Auth redirect example](#auth-redirect-example)
- [Rewrites](#rewrites)
- [External redirects](#external-redirects)
- [Cancellation](#cancellation)
- [Ordering](#ordering)
- [Edge cases](#edge-cases)

## Register middleware

```ts
import { createRouter } from '@cookbook/router';
import { routes } from './routes';

const requireAuth = ({ route, location, redirect }) => {
  if (route.route.route.meta?.requiresAuth) {
    return redirect(`/login?redirect=${encodeURIComponent(location.href)}`);
  }
};

export const router = createRouter({
  routes,
  middleware: [requireAuth],
});
```

## Route-level middleware

Middleware may also be declared directly on a route.

```tsx
{
  id: 'members',
  path: '/members',
  view: MembersPage,
  meta: { requiresAuth: true },
  middleware: [requireAuth],
}
```

Global and route-level middleware both run as part of the navigation pipeline.

## Middleware context

```ts
interface MiddlewareContext {
  readonly route: MatchedRoute;
  readonly location: RouterLocation;
  readonly params: Record<string, unknown>;
  readonly search: ParsedRouteSearch | Record<string, unknown>;
  readonly unknownSearch?: ParsedUnknownRouteSearch;
  readonly hash: ParsedRouteHash | unknown;
  redirect: (to: string) => MiddlewareResult;
  rewrite: (to: string) => MiddlewareResult;
  cancel: () => MiddlewareResult;
}
```

`route` is the destination matched route. `location` is the target location being resolved before the navigation commits.

`params`, `search`, and `hash` contain the parsed URL state for the active match:

- `params` contains parsed path params. Built-in numeric constraints such as `{id:int}` are numbers; unconstrained params and custom constraints are strings.
- `search` contains parsed search fields declared by the matched route. For routes without a search descriptor, it falls back to a generic record.
- `unknownSearch` contains search params that were present in the URL but not declared by the route search descriptor, when unknown search parsing is available for that match.
- `hash` contains the parsed hash value declared by the matched route. For routes without a hash descriptor, it falls back to `unknown`.

Middleware also receives helper functions for controlling the navigation:

- `redirect(to)` resolves another location and commits that redirected URL.
- `rewrite(to)` resolves another location without committing the rewritten URL.
- `cancel()` stops the navigation before it commits.

Runtime metadata is available at:

```ts
route.route.route.meta;
```

The repeated `route` nesting exists because `MatchedRoute` contains a normalized route, and normalized routes preserve the original `RouteDefinition` under `route`.

## Middleware results

```ts
type MiddlewareResult =
  | void
  | false
  | Response
  | {
      readonly type: 'redirect';
      readonly to: string;
    }
  | {
      readonly type: 'rewrite';
      readonly to: string;
    }
  | {
      readonly type: 'cancel';
    };
```

| Return value        | Behavior                                                           |
| ------------------- | ------------------------------------------------------------------ |
| `void`              | Continue navigation.                                               |
| `false`             | Cancel navigation.                                                 |
| `cancel()`          | Cancel navigation explicitly.                                      |
| `redirect('/path')` | Resolve another location and commit the redirected URL to history. |
| `rewrite('/path')`  | Resolve another location without committing the rewritten URL.     |
| `Response`          | Move the router into an error state.                               |

## Auth redirect example

```ts
const requireAuth = ({ route, location, redirect }) => {
  if (!route.route.route.meta?.requiresAuth) {
    return;
  }

  if (session.isLoggedIn()) {
    return;
  }

  return redirect(`/blog/login?redirect=${encodeURIComponent(location.href)}`);
};
```

The login page can read the redirect search param and return the user to the original page after login.

## Rewrites

Use `rewrite()` when middleware should resolve a different route without committing the rewritten URL to history.

```ts
const requireAuth = ({ route, location, rewrite }) => {
  if (!route.route.route.meta?.requiresAuth) {
    return;
  }

  if (session.isLoggedIn()) {
    return;
  }

  return rewrite(`/blog/login?redirect=${encodeURIComponent(location.href)}`);
};
```

A rewrite behaves like an internal redirect for matching and rendering, but it keeps the original URL as the committed history location.

For example, if the user opens `/private` and middleware returns:

```ts
rewrite('/login?redirect=%2Fprivate');
```

The router resolves and renders the login route, but the browser or memory history can keep `/private` as the current history entry.

Use `redirect()` when the URL should visibly change. Use `rewrite()` when the router should render a different route while preserving the original URL.

## External redirects

Middleware can redirect to absolute URLs.

```ts
const docsRedirect = ({ redirect }) => redirect('https://docs.example.com');
```

In browser history, external redirects leave the app through `window.location.assign()` or `window.location.replace()` depending on the navigation mode. Memory and static histories cannot perform real external navigation unless a custom history implements `redirectExternal`.

`rewrite()` is for internal hrefs. Use `redirect()` when middleware needs to leave the app.

## Cancellation

```ts
const blockDraftLeave = ({ cancel }) => {
  if (hasUnsavedDraft()) {
    return cancel();
  }
};
```

Cancelled navigation does not commit the destination URL.

## Ordering

The transition pipeline combines global lifecycle, route lifecycle, and middleware. Middleware runs before the destination is committed. If middleware redirects or rewrites, the result counts toward `maxRedirectDepth`.

## Edge cases

- Middleware should not mutate route definitions.
- Redirect and rewrite loops fail after `maxRedirectDepth` redirects.
- Middleware redirects and rewrites use literal hrefs; route-object redirects belong in route config.
- `rewrite()` is for internal hrefs. Use `redirect()` for external URLs.
- Metadata is not automatically typed inside middleware unless you narrow it yourself.
- Throwing from middleware moves navigation into the error path.
