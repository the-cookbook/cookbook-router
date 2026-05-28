# Routing

Routes describe URL matching, route identity, rendering hierarchy, metadata, redirects, slots, intercepts, middleware, lifecycle hooks, and generated contract inputs.

## Table of contents

- [Route definition](#route-definition)
- [Field reference](#field-reference)
- [Path composition](#path-composition)
- [Index routes](#index-routes)
- [Pathless layouts](#pathless-layouts)
- [Params](#params)
- [Search, hash, and metadata](#search-hash-and-metadata)
- [Redirect routes](#redirect-routes)
- [Layouts and outlets](#layouts-and-outlets)
- [Layout slots](#layout-slots)
- [Intercepting routes](#intercepting-routes)
- [Not found, loading, and error fallbacks](#not-found-loading-and-error-fallbacks)
- [Middleware and lifecycle on routes](#middleware-and-lifecycle-on-routes)
- [Router configuration](#router-configuration)
- [Matching and ranking](#matching-and-ranking)
- [Validation diagnostics](#validation-diagnostics)
- [Best practices](#best-practices)

## Route definition

The current public route shape is:

```ts
interface RouteDefinition {
  readonly id: string;
  readonly path?: string;
  readonly index?: boolean;
  readonly component?: RouteComponent;
  readonly layout?: RouteLayoutDefinition;
  readonly children?: readonly RouteDefinition[];
  readonly intercepts?: RouteIntercepts;
  readonly redirect?: RouteRedirect;
  readonly search?: RouteSearchSchema;
  readonly hash?: readonly string[];
  readonly meta?: RouteMeta;
  readonly loading?: RouteComponent;
  readonly error?: RouteComponent;
  readonly lifecycle?: RouteLifecycle;
  readonly middleware?: readonly Middleware[];
}
```

Supporting shapes:

```ts
interface RouteLayoutDefinition {
  readonly component?: RouteComponent;
  readonly loading?: RouteComponent;
  readonly error?: RouteComponent;
  readonly slots?: RouteSlotDefinitions;
}

type RouteSlotDefinitions = Readonly<Record<string, RouteSlotDefinition>>;
type RouteSlotDefinition = RouteComponent | RouteSlotConfig | true;

interface RouteSlotConfig {
  readonly component?: RouteComponent;
  readonly routes?: readonly RouteDefinition[];
  readonly meta?: RouteMeta;
}
```

## Field reference

| Field              | Purpose                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`               | Required stable route ID. Used for navigation, contracts, diagnostics, and metadata lookup.                 |
| `path`             | URL pattern. Child paths are relative unless they start with `/`.                                           |
| `index`            | Marks a child as the default route for its parent path. Index routes must not define `path`.                |
| `component`        | Page component rendered for this route.                                                                     |
| `layout.component` | Layout wrapper component. Layouts render child branches through `<Outlet />`.                               |
| `layout.slots`     | Named layout regions rendered through `<Slot name="..." />`.                                                |
| `children`         | Primary child route branch.                                                                                 |
| `intercepts`       | Configured source-route interception rules keyed by target slot name.                                       |
| `redirect`         | Internal or external redirect target. Redirect-only routes do not need components.                          |
| `search`           | Search contract source. Use `{ type: 'one' }` for single values and `{ type: 'many' }` for repeated values. |
| `hash`             | Allowed hash fragment values for generated contracts.                                                       |
| `meta`             | Arbitrary metadata preserved in generated contracts and runtime route definitions.                          |
| `loading`          | Route-level React Suspense fallback component rendered while the route subtree is loading.                  |
| `error`            | Route-level React error fallback component rendered when the route subtree throws during rendering.         |
| `lifecycle`        | Route-level transition hooks.                                                                               |
| `middleware`       | Route-level middleware.                                                                                     |

## Path composition

Child paths are relative by default.

```tsx
{
  id: 'users',
  path: '/users',
  children: [
    {
      id: 'users.show',
      path: '{id:int}',
      component: UserPage,
    },
  ],
}
```

Resolved path:

```txt
/users/{id:int}
```

A child path starting with `/` is absolute for URL matching but still belongs to the rendering hierarchy where it is declared.

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  layout: { component: DashboardLayout },
  children: [
    {
      id: 'pricing',
      path: '/pricing',
      component: PricingPage,
    },
  ],
}
```

`pricing` matches `/pricing`. If that route is reached through the active branch, it still renders through the dashboard layout hierarchy.

## Index routes

Index routes inherit the parent path.

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  children: [
    {
      id: 'dashboard.overview',
      index: true,
      component: OverviewPage,
    },
  ],
}
```

Invalid:

```tsx
{
  id: 'dashboard.overview',
  index: true,
  path: '',
  component: OverviewPage,
}
```

Index routes must not define `path`.

## Pathless layouts

A route may define a layout without a path.

```tsx
{
  id: 'app.layout',
  layout: {
    component: AppLayout,
  },
  children: [
    {
      id: 'account',
      path: '/account',
      component: AccountPage,
    },
  ],
}
```

The layout affects rendering but contributes no URL segment.

## Params

Path params come from `@cookbook/pathkit` patterns.

```tsx
{
  id: 'organizations.users.show',
  path: '/organizations/{organizationId:regex([0-9a-fA-F-]+)}/users/{userId:int}',
  component: OrganizationUserPage,
}
```

Generated params are currently typed as strings, including constrained params:

| Pattern                    | Generated value type | Runtime behavior                   |
| -------------------------- | -------------------- | ---------------------------------- |
| `{id}`                     | `string`             | Captures a segment.                |
| `{id:string}`              | `string`             | Captures a string segment.         |
| `{id:int}`                 | `string`             | Matches integer-shaped URL values. |
| `{slug:regex([a-z0-9-]+)}` | `string`             | Matches the configured regex.      |
| `{*path}`                  | `string`             | Captures wildcard path data.       |

Duplicate param names in the same parent-to-child branch fail validation.

Custom path constraints let you define reusable validation rules for route params beyond the built-in constraints such as `int`, `string`, and `regex`. Register them with [`pathConstraints`](#pathconstraints) before using them in route paths.

## Search, hash, and metadata

Search contracts are generated from the keys of `search`.

```tsx
{
  id: 'articles.index',
  path: '/articles',
  search: {
    query: { type: 'one', optional: true },
    tag: { type: 'one', optional: true },
    filters: { type: 'many', optional: true },
  },
  component: ArticlesPage,
}
```

Generated fields follow the declared cardinality:

```ts
type ArticlesSearch = {
  query?: string;
  tag?: string;
  filters?: string | readonly string[];
};
```

Hash values become a string union:

```tsx
{
  id: 'articles.show',
  path: '/articles/{slug}',
  hash: ['comments', 'share'],
  component: ArticlePage,
}
```

Metadata values are generated from the runtime `typeof` of the declared value and marked optional.

```tsx
meta: {
  title: 'Article',
  requiresAuth: true,
}
```

Generates a shape similar to:

```ts
{
  title?: string;
  requiresAuth?: boolean;
}
```

## Redirect routes

A route can redirect to another route without rendering a component.

```tsx
{
  id: 'entry',
  path: '/',
  redirect: {
    route: 'dashboard',
  },
}
```

Redirect with params, search, and hash:

```tsx
{
  id: 'legacy-user',
  path: '/u/{id:int}',
  redirect: {
    route: 'users.show',
    params: { id: '42' },
    search: { tab: 'profile' },
    hash: 'settings',
  },
}
```

Literal string redirects are also supported.

```tsx
{
  id: 'legacy-home',
  path: '/home',
  redirect: '/dashboard',
}
```

Absolute string redirects leave the app in browser history.

```tsx
{
  id: 'external-docs',
  path: '/docs',
  redirect: 'https://docs.example.com',
}
```

Use route-object redirects for internal targets when possible. They keep basenames, params, search, hash, and generated contract behavior consistent.

## Layouts and outlets

A layout component wraps the active child branch. It must render `<Outlet />` to show children.

```tsx
import { Outlet } from '@cookbook/router-react';

export function DashboardLayout() {
  return (
    <main>
      <header>Dashboard</header>
      <Outlet context={{ source: 'dashboard' }} />
    </main>
  );
}
```

Direct child components read outlet context with `useOutletContext()`.

```tsx
const context = useOutletContext<{ source: string }>();
```

Outlet context is direct-child scoped. It does not automatically leak through every descendant route.

## Layout slots

Slots render named layout regions. A slot is declared by its object key. Use a component shorthand for default content, an object when metadata or slot routes are needed, and `true` for declaration-only slots used by children or intercepts.

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    component: DashboardLayout,
    slots: {
      sidebar: {
        component: DashboardSidebar,
        meta: { section: 'dashboard' },
        routes: [
          {
            id: 'dashboard.sidebar.activity',
            path: 'activity',
            component: ActivitySidebar,
          },
        ],
      },
      header: DashboardHeader,
      modal: true,
    },
  },
}
```

Render slots in the layout:

```tsx
import { Outlet, Slot } from '@cookbook/router-react';

export function DashboardLayout() {
  return (
    <main>
      <Outlet />
      <Slot name="sidebar" context={{ user: 'Ada' }} />
      <Slot name="modal" />
    </main>
  );
}
```

Slot rules:

- `slot: Component` declares a slot and renders that component as default content.
- `slot: { component?, meta?, routes? }` declares a slot with optional default content, metadata, and slot routes.
- `slot: true` declares a slot without default content.
- `fallback`, `id`, `null`, and `false` are not supported slot definitions.
- Slot names are layout-scoped, not global.
- Child routes may override a slot only when an ancestor layout declares that slot.
- Slot route IDs are generated because they are real URL-matched route definitions.

When a slot route shares a URL with primary content, define both routes:

```tsx
children: [
  {
    id: 'dashboard.activity',
    path: 'activity',
    component: ActivityPage,
  },
],
layout: {
  slots: {
    sidebar: {
      routes: [
        {
          id: 'dashboard.sidebar.activity',
          path: 'activity',
          component: ActivitySidebar,
        },
      ],
    },
  },
},
```

Use the primary route for navigation and the slot route for the slot-specific UI.

## Intercepting routes

Interception lets a source route preserve its current UI while rendering a destination route into a slot. The browser URL still updates to the canonical destination URL.

Configured intercepts are declared on the source route. `to` targets canonical route IDs, not path patterns. Use a string for a single target route or an array for multiple target route IDs.

```tsx
{
  id: 'blog',
  path: '/blog',
  layout: {
    component: BlogLayout,
    slots: {
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: 'blog.articles.show',
      component: ArticleModal,
    },
  },
  children: [
    { id: 'blog.index', index: true, component: BlogHomePage },
    { id: 'blog.articles', path: 'articles', component: ArticlesPage },
  ],
}
```

The canonical destination must exist as a normal route:

```tsx
{
  id: 'blog.articles.show',
  path: '/blog/articles/{slug:regex([a-z0-9-]+)}',
  component: ArticlePage,
}
```

Link with configured interception:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept="modal">
  Read in modal
</Link>
```

Call-site interception is also supported:

```tsx
<Link
  to="blog.articles.show"
  params={{ slug }}
  intercept={{ slot: 'modal', component: ArticleModal }}
>
  Preview article
</Link>
```

Behavior:

- Client click from `/blog` to `/blog/articles/my-post` can render `ArticleModal` in the active modal slot.
- Direct entry to `/blog/articles/my-post` renders `ArticlePage`.
- Refresh on `/blog/articles/my-post` renders `ArticlePage`.
- Browser back closes the modal by returning to the previous URL.
- Browser forward can restore the modal during the same app session when intercept state exists in history.

## Not found, loading, and error fallbacks

Provider fallback handles the simplest not-found case:

```tsx
<RouterProvider router={router} fallback={<NotFoundPage />} />
```

Use `RouterProvider fallback` for global 404 UI. For section-specific 404 UI, define an explicit catch-all child route inside that section so the section layout stays active.

```tsx
{
  id: 'admin',
  path: '/admin',
  layout: { component: AdminLayout },
  children: [
    {
      id: 'admin.not-found',
      path: '{*path}',
      component: AdminNotFound,
    },
  ],
}
```

Route-level `loading` components are used by `@cookbook/router-react` as React Suspense fallbacks for that route component. They are local to the route that declares them and are not inherited by child routes. Loading components render at the same outlet position as the pending route, so parent layouts and their styling remain active during loading.

Route-level `error` components are used by `@cookbook/router-react` as React error-boundary fallbacks for that route component. They are local to the route that declares them and are not inherited by child routes. The fallback receives `error`, `reset`, and `route` props.

```tsx
function ArticleLoading() {
  return <ArticleSkeleton />;
}

function ArticleErrorFallback(props: RouteErrorFallbackProps) {
  return (
    <section role="alert">
      <h1>Article failed to render</h1>
      <button type="button" onClick={props.reset}>
        Try again
      </button>
    </section>
  );
}

{
  id: 'blog.articles.show',
  path: 'articles/{slug}',
  component: ArticlePage,
  loading: ArticleLoading,
  error: ArticleErrorFallback,
}
```

Layouts may also define `layout.loading` and `layout.error`. Values under `layout` are shared by that layout tree: they apply to the route component rendered by the layout and are inherited by descendant routes that do not define their own local fallback. Both fallbacks render inside that layout's `<Outlet />` position, so the layout shell remains mounted and is not recreated while child content is loading or has failed. The React provider keeps the boundary shape stable and memoizes fallback elements by fallback component and owner route, which prevents unchanged layouts from blinking during navigation.

```tsx
function DashboardLayout() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}

function DashboardLoading() {
  return <DashboardPageSkeleton />;
}

function DashboardErrorFallback() {
  return <DashboardErrorState />;
}

{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    component: DashboardLayout,
    loading: DashboardLoading,
    error: DashboardErrorFallback,
  },
  children: [
    {
      id: 'dashboard.overview',
      index: true,
      component: lazy(() => import('./overview')),
    },
  ],
}
```

If a child route declares its own `loading` or `error`, that route-level fallback wins for that route only. It does not become the fallback for grandchildren. Put shared pending/error UI under `layout.loading` or `layout.error`.

`error` handles React rendering and lazy-import errors. Router transition errors from middleware or lifecycle hooks still flow through router navigation error handling.

## Middleware and lifecycle on routes

Routes can own middleware and lifecycle hooks.

```tsx
{
  id: 'admin',
  path: '/admin',
  component: AdminPage,
  meta: { requiresAuth: true },
  middleware: [requireAuth],
  lifecycle: {
    beforeEnter: ({ location }) => {
      analytics.preview(location.href);
    },
    afterEnter: ({ location }) => {
      analytics.page(location.href);
    },
  },
}
```

Global middleware and lifecycle hooks are configured on the router. Route-level middleware and lifecycle hooks are resolved through the matched branch.

## Router configuration

```ts
const router = createRouter({
  routes,
  basename: '/app',
  maxRedirectDepth: 10,
  pathOptions: {
    prune: 'all',
  },
});
```

### `basename`

`basename` is a visible URL prefix.

```ts
createRouter({ routes, basename: '/foo' });
```

- `router.href('blog.index')` includes `/foo`.
- Matching strips `/foo` before route matching.
- Browser URLs keep `/foo` visible.
- Intercept matching compares app paths after stripping the basename.

### `maxRedirectDepth`

Redirects are bounded to prevent loops. Use `maxRedirectDepth`; `maxRedirectionDepth` is accepted as an alias.

```ts
createRouter({ routes, maxRedirectDepth: 20 });
```

### `pathConstraints`

Custom path constraints let route params use reusable validation rules beyond the built-in constraints such as `int`, `string`, and `regex`. Create custom constraints with `createConstraint()` and register them through `defineRoutes(..., { pathConstraints })` before using them in route paths.

`defineRoutes()` validates route patterns immediately, so any custom constraint referenced by a route path must already be registered. For the full constraint API, see the `@cookbook/pathkit` documentation for `createConstraint`.

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

const router = createRouter({
  routes,
});
```

`defineRoutes(..., { pathConstraints })` registers constraints before immediate route validation. Router creation also accepts `pathConstraints` for route arrays that have not already been validated. Register the same constraints on the server and client when using SSR.

### `pathOptions.prune`

Path options are forwarded to `@cookbook/pathkit` wrappers and router canonicalization.

Default:

```ts
pathOptions: {
  prune: 'all',
}
```

Supported values:

| Value           | Behavior                                              |
| --------------- | ----------------------------------------------------- |
| `'all'`         | Remove duplicated delimiters and trailing delimiters. |
| `'duplication'` | Remove duplicated delimiters only.                    |
| `'trailing'`    | Remove trailing delimiters only.                      |
| `false`         | Preserve paths exactly as declared/generated.         |

With the default, `/gallery/` canonicalizes to `/gallery` when it matches a route.

## Matching and ranking

Matching is deterministic:

1. Static routes rank before dynamic routes.
2. Dynamic routes rank before wildcard routes.
3. Index routes are prioritized for their parent path.
4. Route IDs remain the primary lookup key for navigation and diagnostics.

Matching uses normalized route paths and `@cookbook/pathkit` constraints.

## Validation diagnostics

Validation fails for common route tree problems, including:

- duplicate route IDs
- duplicate full paths
- missing route IDs
- index routes with `path`
- routes with both `index: true` and `path`
- duplicate params in a branch
- invalid path patterns
- invalid slot definitions
- malformed redirect config
- invalid configured intercept targets

Error messages include route IDs or invalid field names where possible.

## Best practices

- Treat route IDs as stable public API.
- Prefer route-object redirects over literal internal string redirects.
- Use `basename` instead of hard-coding deployment prefixes in route paths.
- Define primary routes for navigable pages and slot routes for slot-specific UI.
- Slot defaults do not have separate route IDs and are not generated as route contracts.
- Use direct `useOutletContext<Context>()` for slot default context unless you have generated outlet context contracts.
- Use configured intercepts for route-owned UX patterns and call-site intercepts for local UI decisions.
- Keep external URLs out of route params; use string redirects or normal anchors for external navigation.
