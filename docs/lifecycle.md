# Lifecycle

Lifecycle hooks observe route transitions. Use middleware for access control and lifecycle hooks for transition side effects.

## Table of contents

- [Route lifecycle](#route-lifecycle)
- [Global lifecycle](#global-lifecycle)
- [Lifecycle context](#lifecycle-context)
- [Blocking navigation](#blocking-navigation)
- [Errors](#errors)
- [Lifecycle versus middleware](#lifecycle-versus-middleware)
- [Best practices](#best-practices)

## Route lifecycle

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  component: DashboardPage,
  lifecycle: {
    beforeEnter: async (context) => {
      await preloadDashboard(context.location.pathname);
    },
    afterEnter: (context) => {
      analytics.page(context.location.pathname);
    },
    beforeLeave: () => {
      return confirmUnsavedChanges();
    },
    onError: (error, context) => {
      reportError(error, context.location.href);
    },
  },
}
```

`beforeEnter` and `beforeLeave` may return `false` to block navigation.

## Global lifecycle

```ts
const router = createRouter({
  routes,
  lifecycle: {
    beforeNavigate: async (context) => {
      performance.mark(`navigation:${context.location.href}:start`);
    },
    afterNavigate: (context) => {
      performance.mark(`navigation:${context.location.href}:end`);
    },
    onNavigationError: (error, context) => {
      reportError(error, context.location.href);
    },
  },
});
```

## Lifecycle context

```ts
interface RouteLifecycleContext {
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}
```

- `from` is the previous route match.
- `to` is the destination route match.
- either can be `null` for unmatched or initial locations.
- `location` is the destination location for the transition.

## Blocking navigation

```ts
beforeLeave: () => {
  if (formIsDirty()) {
    return false;
  }
};
```

Returning `false` blocks navigation and keeps the current route state.

## Errors

Route-level `onError` and global `onNavigationError` receive thrown errors from the transition pipeline.

```ts
onNavigationError: (error, context) => {
  logger.error(error, { href: context.location.href });
};
```

## Lifecycle versus middleware

| Use case                   | Prefer                                      |
| -------------------------- | ------------------------------------------- |
| Auth checks                | Middleware                                  |
| Login redirects            | Middleware or route redirect                |
| Analytics after commit     | Lifecycle `afterEnter` / `afterNavigate`    |
| Preloading before commit   | Lifecycle `beforeEnter`                     |
| Prevent leaving dirty form | Lifecycle `beforeLeave` or UI-level blocker |
| External redirect route    | Route `redirect`                            |

Lifecycle hooks currently do not receive a `redirect()` helper. Use middleware or route-level `redirect` for redirects.

## Best practices

- Keep lifecycle hooks idempotent where possible.
- Do not put UI rendering logic in lifecycle hooks.
- Do not use lifecycle for authentication redirects when middleware expresses the behavior directly.
- Prefer route-level lifecycle for route-owned side effects and global lifecycle for instrumentation.
- Handle errors through `onError` or `onNavigationError`; the router does not log by default.
