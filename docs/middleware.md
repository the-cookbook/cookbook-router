# Middleware

Middleware runs before navigation commits. Use it for access checks, redirects, cancellation, and pre-navigation validation.

## Table of contents

- [Register middleware](#register-middleware)
- [Route-level middleware](#route-level-middleware)
- [Middleware context](#middleware-context)
- [Middleware results](#middleware-results)
- [Auth redirect example](#auth-redirect-example)
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
  component: MembersPage,
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
  readonly params: Record<string, string>;
  redirect: (to: string) => MiddlewareResult;
  cancel: () => MiddlewareResult;
}
```

`route` is the destination matched route. Runtime metadata is available at:

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
  | { readonly type: 'redirect'; readonly to: string }
  | { readonly type: 'cancel' };
```

| Return value        | Behavior                             |
| ------------------- | ------------------------------------ |
| `void`              | Continue navigation.                 |
| `false`             | Cancel navigation.                   |
| `cancel()`          | Cancel navigation explicitly.        |
| `redirect('/path')` | Redirect to a literal href.          |
| `Response`          | Move the router into an error state. |

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

## External redirects

Middleware can redirect to absolute URLs.

```ts
const docsRedirect = ({ redirect }) => redirect('https://docs.example.com');
```

In browser history, external redirects leave the app through `window.location.assign()` or `window.location.replace()` depending on the navigation mode. Memory and static histories cannot perform real external navigation unless a custom history implements `redirectExternal`.

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

The transition pipeline combines global lifecycle, route lifecycle, and middleware. Middleware runs before the destination is committed. If middleware redirects, the redirect counts toward `maxRedirectDepth`.

## Edge cases

- Middleware should not mutate route definitions.
- Redirect loops fail after `maxRedirectDepth` redirects.
- Middleware redirects use literal hrefs; route-object redirects belong in route config.
- Metadata is not automatically typed inside middleware unless you narrow it yourself.
- Throwing from middleware moves navigation into the error path.
