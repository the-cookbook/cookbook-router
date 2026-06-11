# Routing

Routes describe URL matching, route identity, rendering hierarchy, metadata, redirects, slots, intercepts, middleware, lifecycle hooks, and generated contract inputs. URL state is parsed and built by `@cookbook/urlkit`; Cookbook Router owns the route tree and routing behavior around that URL state.

## Table of contents

- [Route definition](#route-definition)
- [Field reference](#field-reference)
- [Path composition](#path-composition)
- [Path routes and constraints](#path-routes-and-constraints)
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
  readonly view?: RouteView;
  readonly layout?: RouteLayoutDefinition;
  readonly children?: readonly RouteDefinition[];
  readonly intercepts?: RouteIntercepts;
  readonly redirect?: RouteRedirect;
  readonly search?: RouteSearchSchema;
  readonly hash?: RouteHashSchema;
  readonly url?: RouterUrlOptions;
  readonly meta?: RouteMeta;
  readonly loading?: RouteView;
  readonly error?: RouteView;
  readonly lifecycle?: RouteLifecycle;
  readonly middleware?: readonly Middleware[];
}
```

Supporting shapes:

```ts
interface RouteLayoutDefinition {
  readonly view?: RouteView;
  readonly slots?: RouteSlotDefinitions;
}

type RouteSlotDefinitions = Readonly<Record<string, RouteSlotDefinition>>;
type RouteSlotDefinition = RouteView | RouteSlotConfig | true;

interface RouteSlotConfig {
  readonly view?: RouteView;
  readonly routes?: readonly RouteDefinition[];
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
  readonly view: RouteView;
}

type RouteIntercepts = Readonly<Record<string, RouteInterceptConfig>>;
```

## Field reference

| Field          | Purpose                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | Required stable route ID. Used for navigation, contracts, diagnostics, and metadata lookup.                                                                     |
| `path`         | URL pattern. Child paths are relative unless they start with `/`.                                                                                               |
| `index`        | Marks a child as the default route for its parent path. Index routes must not define `path`.                                                                    |
| `view`         | Page view rendered for this route.                                                                                                                              |
| `layout.view`  | Layout wrapper view. Layouts render child branches through `<Outlet />`.                                                                                        |
| `layout.slots` | Named layout regions rendered through `<Slot name="..." />`.                                                                                                    |
| `children`     | Primary child route branch.                                                                                                                                     |
| `intercepts`   | Configured source-route interception rules keyed by target slot name.                                                                                           |
| `redirect`     | Internal or external redirect target. Redirect-only routes do not need views.                                                                                   |
| `search`       | URLKit-backed Router static search descriptor for parsed search state and generated contracts.                                                                  |
| `hash`         | URLKit-backed static hash object descriptor for parsed hash state and generated contracts.                                                                      |
| `url`          | Route-level URL options such as `arrayFormat`, `defaults`, `invalidSearch`, `invalidHash`, and `unknownSearch`; overrides router-level defaults for this route. |
| `meta`         | Arbitrary metadata preserved in generated contracts and runtime route definitions.                                                                              |
| `loading`      | Route-level React Suspense fallback view rendered while the route subtree is loading.                                                                           |
| `error`        | Route-level React error fallback view rendered when the route subtree throws during rendering.                                                                  |
| `lifecycle`    | Route-level transition hooks.                                                                                                                                   |
| `middleware`   | Route-level middleware.                                                                                                                                         |

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
      view: UserPage,
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
      view: TermsOfServicePage,
    },
  ],
}
```

`terms-of-service` matches `/policies/terms-of-service`, not `/terms-of-service`. Top-level routes can still use leading `/` normally.

## Path routes and constraints

Route `path` values use PathKit syntax and URLKit parsed-param semantics. PathKit owns the route-pattern grammar and constraint validation; URLKit owns the parsed route URL state used by matches, params, and href generation.

For the complete path guide, including detailed examples and custom constraints, see [Path routes and constraints](path-routes.md).

Built-in constraints are:

| Constraint  | Syntax                                                | Generated/runtime type | Purpose                                                                     |
| ----------- | ----------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `int`       | `{id:int}`                                            | `number`               | Unsigned integer segment.                                                   |
| `decimal`   | `{price:decimal}`                                     | `number`               | Finite decimal segment.                                                     |
| `range`     | `{page:range(1,100)}`                                 | `number`               | Numeric segment inside an inclusive range.                                  |
| `min`       | `{price:min(1)}`                                      | `number`               | Numeric segment greater than or equal to the minimum.                       |
| `max`       | `{price:max(10)}`                                     | `number`               | Numeric segment less than or equal to the maximum.                          |
| `uuid`      | `{id:uuid}`                                           | `string`               | Canonical hyphenated UUID segment.                                          |
| `minlength` | `{slug:minlength(3)}`                                 | `string`               | Segment with at least the specified number of characters.                   |
| `maxlength` | `{slug:maxlength(50)}`                                | `string`               | Segment with no more than the specified number of characters.               |
| `list`      | <code>{view:list(grid&#124;list&#124;details)}</code> | `string`               | Segment that exactly matches one item from a pipe-separated list.           |
| `regex`     | `{slug:regex([a-z0-9-]+)}`                            | `string`               | Segment that matches a raw regex source. Do not include `/.../` delimiters. |

Use `{param}` for an unconstrained string segment. There is no built-in `{param:number}` or `{param:string}` constraint.

Constraints can be chained:

```txt
/products/{price:decimal:min(1):max(10)}
/articles/{slug:minlength(3):maxlength(50)}
/scores/{score:regex(\d+):min(1)}
```

URLKit infers parsed param types from the full constraint chain, not from the first constraint. If `int`, `decimal`, `range`, `min`, or `max` appears anywhere in the chain, Router runtime state and generated contracts use `number`. Otherwise the param uses `string`.

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
      view: OverviewPage,
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
  view: OverviewPage,
}
```

Index routes must not define `path`.

## Pathless layouts

A route may define a layout without a path.

```tsx
{
  id: 'app.layout',
  layout: {
    view: AppLayout,
  },
  children: [
    {
      id: 'account',
      path: '/account',
      view: AccountPage,
    },
  ],
}
```

The layout affects rendering but contributes no URL segment. Pathless routes are only valid as layout/group routes with children. A route that renders, redirects, declares search/hash contracts, or participates in navigation must define either `path` or `index: true`.

## Params

Path params use PathKit path-pattern syntax and URLKit parsed-param semantics. PathKit validates the path pattern and constraint chain. URLKit parses route URL state with `params: 'parsed'`, so runtime matches, `useParams()`, redirects, and generated contracts expose parsed values instead of raw URL strings.

```tsx
{
  id: 'organizations.users.show',
  path: '/organizations/{organizationId:uuid}/users/{userId:int}',
  view: OrganizationUserPage,
}
```

Generated params and runtime match state use the same parsed URLKit values:

```ts
type OrganizationUserParams = {
  organizationId: string;
  userId: number;
};
```

Param inference uses the full PathKit constraint chain:

| Pattern                                               | Parsed/generated type | Runtime behavior                                                         |
| ----------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `{id}`                                                | `string`              | Captures an unconstrained string segment.                                |
| `{id:int}`                                            | `number`              | Parses an integer-shaped URL value.                                      |
| `{price:decimal}`                                     | `number`              | Parses a finite decimal URL value.                                       |
| `{page:range(1,100)}`                                 | `number`              | Parses a numeric value inside the inclusive range.                       |
| `{price:min(1)}`                                      | `number`              | Parses a numeric value greater than or equal to the minimum.             |
| `{price:max(10)}`                                     | `number`              | Parses a numeric value less than or equal to the maximum.                |
| `{id:uuid}`                                           | `string`              | Matches canonical hyphenated UUID values.                                |
| `{slug:minlength(3)}`                                 | `string`              | Matches values with at least the specified length.                       |
| `{slug:maxlength(50)}`                                | `string`              | Matches values with no more than the specified length.                   |
| <code>{view:list(grid&#124;list&#124;details)}</code> | `string`              | Matches one exact value from the list.                                   |
| `{slug:regex([a-z0-9-]+)}`                            | `string`              | Matches the configured raw regex source.                                 |
| `{score:regex(\d+):min(1)}`                           | `number`              | Numeric because `min` appears anywhere in the chain.                     |
| `{score:min(1):regex(\d+)}`                           | `number`              | Numeric for the same reason; constraint order does not change inference. |
| `{slug:slug}`                                         | `string`              | Uses a registered custom constraint.                                     |
| `{*path}`                                             | `string`              | Captures wildcard path data.                                             |

Optional params generate optional properties and are absent when the segment is not present:

```tsx
{
  id: 'products.optional',
  path: '/products/{id:int?}',
  view: ProductPage,
}
```

Generated params:

```ts
type ProductParams = {
  id?: number;
};
```

Custom path constraints let you define reusable validation rules for route params beyond the built-in `int`, `decimal`, `range`, `min`, `max`, `uuid`, `minlength`, `maxlength`, `list`, and `regex` constraints. Register them with [`pathConstraints`](#pathconstraints) before using them in route paths so the router can forward them to URLKit before route validation, matching, and href generation.

Custom constraints generate `string` params unless the same constraint chain also includes a numeric built-in constraint. For example, `{slug:slug}` is `string`, while `{id:slug:min(1)}` is `number` because `min` appears in the chain.

Duplicate param names in the same parent-to-child branch fail validation.

See [Path routes and constraints](path-routes.md) for the complete constraint API.

## Search, hash, and metadata

Search contracts are generated from URLKit-backed Router static `search` descriptors. Keep descriptors static in route files consumed by the CLI; do not use URLKit runtime builders there unless static extraction explicitly supports them.

```tsx
{
  id: 'articles.index',
  path: '/articles',
  search: {
    query: { type: 'string', optional: true },
    page: { type: 'int', default: 1 },
    filters: { type: 'string', many: true, optional: true },
  },
  url: {
    arrayFormat: 'comma',
    unknownSearch: 'strip',
  },
  view: ArticlesPage,
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

`url.arrayFormat` controls repeated search param parsing and building. `url.unknownSearch` controls undeclared query keys and defaults to `'strip'`. Router-level defaults can be set on `createRouter({ url })`; route-level `url` overrides router defaults; URL-building call-site options such as `router.href()`, `router.navigate.to()`, `useHref()`, `Link`, and `NavLink` can override build options such as `arrayFormat` and `defaults`.

When `unknownSearch: 'preserve'` is active, declared search remains typed and unknown keys are exposed separately on the match as `unknownSearch`.

Hash values become a string union:

```tsx
{
  id: 'articles.show',
  path: '/articles/{slug}',
  hash: { type: 'enum', values: ['comments', 'share'], optional: true },
  view: ArticlePage,
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

A route can redirect to another route without rendering a view. Redirect routes must be addressable with either `path` or `index: true`. Use an index redirect when a parent route should redirect from its own URL.

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

A layout view wraps the active child branch. It must render `<Outlet />` to show children.

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

Direct child views read outlet context with `useOutletContext()`.

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
    view: DashboardLayout,
    slots: {
      sidebar: {
        view: DashboardSidebar,
        routes: [
          {
            id: 'dashboard.sidebar.activity',
            path: 'activity',
            view: ActivitySidebar,
          },
        ],
      },
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

- `true` enables a declared slot without fallback content.
- A slot `view` renders when no slot route or intercept is active for that slot.
- Slot configs support only `view`, `meta`, and `routes`.
- Slot names are layout-scoped, not global.
- Slot route IDs are generated because they are real URL-matched route definitions.
- The removed `fallback`, `fallback.id`, and `id` slot forms fail validation; see [Route validation errors](route-validation-errors.md).

When a slot route shares a URL with primary content, define both routes:

```tsx
children: [
  {
    id: 'dashboard.activity',
    path: 'activity',
    view: ActivityPage,
  },
],
layout: {
  slots: {
    sidebar: {
      routes: [
        {
          id: 'dashboard.sidebar.activity',
          path: 'activity',
          view: ActivitySidebar,
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
    view: BlogLayout,
    slots: {
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: ['articles/{slug:regex([a-z0-9-]+)}'],
      view: ArticleModal,
    },
  },
  children: [
    { id: 'blog.index', index: true, view: BlogHomePage },
    { id: 'blog.articles', path: 'articles', view: ArticlesPage },
  ],
}
```

The canonical destination must exist as a normal route:

```tsx
{
  id: 'blog.articles.show',
  path: '/blog/articles/{slug:regex([a-z0-9-]+)}',
  view: ArticlePage,
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
<Link to="blog.articles.show" params={{ slug }} intercept={{ slot: 'modal', view: ArticleModal }}>
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
  layout: { view: AdminLayout },
  children: [
    {
      id: 'admin.not-found',
      path: '{*path}',
      view: AdminNotFound,
    },
  ],
}
```

Route-level `loading` views are used by `@cookbook/router-react` as React Suspense fallbacks. They render while a lazy route view, layout, slot route, or intercepted route suspends.

Route-level `error` views are used by `@cookbook/router-react` as React error-boundary fallbacks. The nearest matched route with an `error` view owns errors thrown by its route subtree. The fallback receives `error`, `reset`, and `route` props.

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
  view: ArticlePage,
  loading: ArticleLoading,
  error: ArticleErrorFallback,
}
```

`error` handles React rendering and lazy-import errors. Router transition errors from middleware or lifecycle hooks still flow through router navigation error handling.

## Middleware and lifecycle on routes

Routes can own middleware and lifecycle hooks.

```tsx
{
  id: 'admin',
  path: '/admin',
  view: AdminPage,
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

Custom path constraints let route params use reusable validation rules beyond the built-in `decimal`, `int`, `uuid`, `min`, `max`, `range`, `minlength`, `maxlength`, `list`, and `regex` constraints. Create custom constraints with `createConstraint()` and register them through `defineRoutes(..., { pathConstraints })` before using them in route paths.

`defineRoutes()` validates route patterns immediately, so any custom constraint referenced by a route path must already be registered. Cookbook Router forwards registered constraints to URLKit before descriptor validation, matching, parsing, and href building. For all built-in constraints, custom constraint APIs, and common mistakes, see [Path routes and constraints](path-routes.md).

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

`defineRoutes()`, `validateRoutes()`, router creation, and CLI generation validate route trees before they are used. Error messages include route IDs or invalid field names where possible.

For the full catalog of route validation failures with symptoms, causes, and fixes, see [Route validation errors](route-validation-errors.md).

## Best practices

- Treat route IDs as stable public API.
- Prefer route-object redirects over literal internal string redirects.
- Use `basename` instead of hard-coding deployment prefixes in route paths.
- Define primary routes for navigable pages and slot routes for slot-specific UI.
- Use direct `useOutletContext<Context>()` for slot view context unless you have generated outlet context contracts.
- Use configured intercepts for route-owned UX patterns and call-site intercepts for local UI decisions.
- Keep external URLs out of route params; use string redirects or normal anchors for external navigation.
