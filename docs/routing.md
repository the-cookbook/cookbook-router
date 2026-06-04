# Routing

Routes describe URL matching, route identity, rendering hierarchy, metadata, redirects, slots, intercepts, middleware, lifecycle hooks, and generated contract inputs. URL state is parsed and built by `@cookbook/urlkit`; Cookbook Router owns the route tree and routing behavior around that URL state.

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
  readonly hash?: RouteHashSchema;
  readonly url?: RouterUrlOptions;
  readonly meta?: RouteMeta;
  readonly loading?: RouteComponent;
  readonly errorFallback?: RouteComponent;
  readonly lifecycle?: RouteLifecycle;
  readonly middleware?: readonly Middleware[];
}
```

Supporting shapes:

```ts
interface RouteLayoutDefinition {
  readonly component?: RouteComponent;
  readonly slots?: RouteSlotDefinitions;
}

type RouteSlotDefinitions = Readonly<Record<string, RouteSlotDefinition>>;
type RouteSlotDefinition = RouteSlotConfig | false;

interface RouteSlotConfig {
  readonly fallback?: RouteSlotFallback | null;
  readonly routes?: readonly RouteDefinition[];
  readonly meta?: RouteMeta;
}

interface RouteSlotFallback {
  readonly id?: string;
  readonly component: RouteComponent;
  readonly meta?: RouteMeta;
}

type RouteRedirect =
  | string
  | {
      readonly route: string;
      readonly params?: Record<string, unknown>;
      readonly search?: Record<string, unknown>;
      readonly hash?: string | null;
    };

interface RouteInterceptConfig {
  readonly to: readonly string[];
  readonly component: RouteComponent;
}

type RouteIntercepts = Readonly<Record<string, RouteInterceptConfig>>;
```

## Field reference

| Field              | Purpose                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | Required stable route ID. Used for navigation, contracts, diagnostics, and metadata lookup.                                        |
| `path`             | URL pattern. Child paths are relative unless they start with `/`.                                                                  |
| `index`            | Marks a child as the default route for its parent path. Index routes must not define `path`.                                       |
| `component`        | Page component rendered for this route.                                                                                            |
| `layout.component` | Layout wrapper component. Layouts render child branches through `<Outlet />`.                                                      |
| `layout.slots`     | Named layout regions rendered through `<Slot name="..." />`.                                                                       |
| `children`         | Primary child route branch.                                                                                                        |
| `intercepts`       | Configured source-route interception rules keyed by target slot name.                                                              |
| `redirect`         | Internal or external redirect target. Redirect-only routes do not need components.                                                 |
| `search`           | URLKit-compatible static search descriptor for parsed search state and generated contracts.                                        |
| `hash`             | URLKit-compatible static hash descriptor or allowed hash fragment values.                                                          |
| `url`              | Route-level URL options such as `arrayFormat`, `invalidSearch`, and `invalidHash`; overrides router-level defaults for this route. |
| `meta`             | Arbitrary metadata preserved in generated contracts and runtime route definitions.                                                 |
| `loading`          | Route-level React Suspense fallback component rendered while the route subtree is loading.                                         |
| `errorFallback`    | Route-level React error fallback component rendered when the route subtree throws during rendering.                                |
| `lifecycle`        | Route-level transition hooks.                                                                                                      |
| `middleware`       | Route-level middleware.                                                                                                            |

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

Child paths may include a leading `/`, but they are still composed relative to the parent route. This lets route files use either `terms-of-service` or `/terms-of-service` for the same nested URL segment.

```tsx
{
  id: 'policies',
  path: '/policies',
  children: [
    {
      id: 'terms-of-service',
      path: '/terms-of-service',
      component: TermsOfServicePage,
    },
  ],
}
```

`terms-of-service` matches `/policies/terms-of-service`, not `/terms-of-service`. Top-level routes can still use leading `/` normally.

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

The layout affects rendering but contributes no URL segment. Pathless routes are only valid as layout/group routes with children. A route that renders, redirects, declares search/hash contracts, or participates in navigation must define either `path` or `index: true`.

## Params

Path params use PathKit path-pattern syntax and URLKit parsed-param semantics. PathKit remains the path-pattern primitive beneath URLKit, while URLKit owns parsing, validation, URL matching, and href path building for route URL contracts.

```tsx
{
  id: 'organizations.users.show',
  path: '/organizations/{organizationId:regex([0-9a-fA-F-]+)}/users/{userId:int}',
  component: OrganizationUserPage,
}
```

Generated params and runtime match state use parsed URLKit values:

| Pattern                    | Parsed/generated type | Runtime behavior                     |
| -------------------------- | --------------------- | ------------------------------------ |
| `{id}`                     | `string`              | Captures a segment.                  |
| `{id:string}`              | `string`              | Captures a string segment.           |
| `{id:int}`                 | `number`              | Parses an integer-shaped URL value.  |
| `{value:number}`           | `number`              | Parses a numeric URL value.          |
| `{slug:regex([a-z0-9-]+)}` | `string`              | Matches the configured regex.        |
| `{slug:slug}`              | `string`              | Uses a registered custom constraint. |
| `{*path}`                  | `string`              | Captures wildcard path data.         |

Duplicate param names in the same parent-to-child branch fail validation.

Custom path constraints let you define reusable validation rules for route params beyond the built-in constraints such as `int`, `number`, `string`, and `regex`. Register them with [`pathConstraints`](#pathconstraints) before using them in route paths so the router can forward them to URLKit before route validation, matching, and href generation. Custom constraints generate `string` params unless URLKit supports typed static inference for the custom constraint.

## Search, hash, and metadata

Search contracts are generated from URLKit-compatible static `search` descriptors. Keep descriptors static in route files consumed by the CLI; do not use URLKit runtime builders there unless static extraction explicitly supports them.

```tsx
{
  id: 'articles.index',
  path: '/articles',
  search: {
    query: { value: 'string', optional: true },
    page: { value: 'int', default: 1 },
    filters: { value: 'string', type: 'many', optional: true },
  },
  url: {
    arrayFormat: 'comma',
  },
  component: ArticlesPage,
}
```

Generated fields and runtime state follow URLKit parsing semantics:

```ts
type ArticlesSearch = {
  query?: string;
  page: number;
  filters?: readonly string[];
};
```

`url.arrayFormat` controls repeated search param parsing and building. Router-level defaults can be set on `createRouter({ url })`; route-level `url` overrides router defaults; per-call, hook, and component `url` options override both.

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

A route can redirect to another route without rendering a component. Redirect routes must be addressable with either `path` or `index: true`. Use an index redirect when a parent route should redirect from its own URL.

```tsx
{
  id: 'entry',
  path: '/',
  children: [
    {
      id: 'entry.redirect',
      index: true,
      redirect: {
        route: 'dashboard',
      },
    },
  ],
}
```

Redirect with params, search, and hash:

```tsx
{
  id: 'legacy-user',
  path: '/u/{id:int}',
  redirect: {
    route: 'users.show',
    params: { id: 42 },
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

Slots render named layout regions.

```tsx
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    component: DashboardLayout,
    slots: {
      sidebar: {
        fallback: {
          id: 'dashboard.sidebar.fallback',
          component: DashboardSidebar,
        },
        routes: [
          {
            id: 'dashboard.sidebar.activity',
            path: 'activity',
            component: ActivitySidebar,
          },
        ],
      },
      modal: {
        fallback: null,
      },
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

- `fallback` renders when no slot route matches.
- `fallback: null` creates an empty but valid slot.
- `false` disables an inherited slot for that branch.
- Slot names are layout-scoped, not global.
- Slot fallback IDs are useful for diagnostics but are not generated as navigable route contracts.
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

Configured intercepts are declared on the source route.

```tsx
{
  id: 'blog',
  path: '/blog',
  layout: {
    component: BlogLayout,
    slots: {
      modal: { fallback: null },
    },
  },
  intercepts: {
    modal: {
      to: ['articles/{slug:regex([a-z0-9-]+)}'],
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

Route-level `loading` components are used by `@cookbook/router-react` as React Suspense fallbacks. They render while a lazy route component, layout, slot route, or intercepted route suspends.

Route-level `errorFallback` components are used by `@cookbook/router-react` as React error-boundary fallbacks. The nearest matched route with an `errorFallback` owns errors thrown by its route subtree. The fallback receives `error`, `reset`, and `route` props.

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
  errorFallback: ArticleErrorFallback,
}
```

`errorFallback` handles React rendering and lazy-import errors. Router transition errors from middleware or lifecycle hooks still flow through router navigation error handling.

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

Custom path constraints let route params use reusable validation rules beyond the built-in constraints such as `int`, `number`, `string`, and `regex`. Create custom constraints with `createConstraint()` and register them through `defineRoutes(..., { pathConstraints })` before using them in route paths.

`defineRoutes()` validates route patterns immediately, so any custom constraint referenced by a route path must already be registered. Cookbook Router forwards registered constraints to URLKit before descriptor validation, matching, parsing, and href building. For the full constraint API, see the `@cookbook/pathkit` documentation for `createConstraint`.

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

Path options are forwarded to PathKit wrappers and router canonicalization. URL state parsing/building remains owned by URLKit.

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

Matching uses normalized route paths and URLKit-backed route URL contracts. PathKit remains the lower-level path-pattern primitive beneath URLKit.

## Validation diagnostics

Validation fails for common route tree problems, including:

- duplicate route IDs
- duplicate full paths
- missing route IDs
- index routes with `path`
- routes with both `index: true` and `path`
- routes that are neither pathless layout/group routes nor addressable through `path` or `index`
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
- Keep slot fallback IDs out of generated contract expectations.
- Use direct `useOutletContext<Context>()` for slot fallback context unless you have generated outlet context contracts.
- Use configured intercepts for route-owned UX patterns and call-site intercepts for local UI decisions.
- Keep external URLs out of route params; use string redirects or normal anchors for external navigation.
