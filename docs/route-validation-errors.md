# Route validation errors

Use this page when `defineRoutes()`, `validateRoutes()`, `createRouter()`, or the CLI `validate`/`generate` commands fail while validating route definitions.

`defineRoutes()` validates immediately. The CLI also calls the same route validation after it loads a route file. Most errors include the route ID and field name that failed.

## Table of contents

- [Invalid route root](#invalid-route-root)
- [Invalid route entry](#invalid-route-entry)
- [Missing route ID](#missing-route-id)
- [Duplicate route ID](#duplicate-route-id)
- [Invalid `index`](#invalid-index)
- [Invalid `path`](#invalid-path)
- [Index route declares `path`](#index-route-declares-path)
- [Index route declares `children`](#index-route-declares-children)
- [Invalid `children`](#invalid-children)
- [Removed route `errorFallback`](#removed-route-errorfallback)
- [Invalid `layout`](#invalid-layout)
- [Invalid `search` root](#invalid-search-root)
- [Invalid `meta`](#invalid-meta)
- [Unsafe `search` or `meta` key](#unsafe-search-or-meta-key)
- [Invalid pathless route](#invalid-pathless-route)
- [Empty path](#empty-path)
- [Invalid path pattern](#invalid-path-pattern)
- [Duplicate route path](#duplicate-route-path)
- [Duplicate inherited param](#duplicate-inherited-param)
- [Invalid static search descriptor](#invalid-static-search-descriptor)
- [Invalid static hash descriptor](#invalid-static-hash-descriptor)
- [Hash value includes `#`](#hash-value-includes-)
- [Invalid redirect shape](#invalid-redirect-shape)
- [Empty string redirect](#empty-string-redirect)
- [Invalid redirect target](#invalid-redirect-target)
- [Invalid redirect params](#invalid-redirect-params)
- [Invalid redirect search](#invalid-redirect-search)
- [Invalid redirect hash](#invalid-redirect-hash)
- [Removed `layout.errorFallback`](#removed-layouterrorfallback)
- [Layout fallback without layout view](#layout-fallback-without-layout-view)
- [Slots without layout view](#slots-without-layout-view)
- [Invalid `layout.slots`](#invalid-layoutslots)
- [Empty slot name](#empty-slot-name)
- [Slot not declared on an active layout](#slot-not-declared-on-an-active-layout)
- [Invalid slot configuration](#invalid-slot-configuration)
- [Removed slot ID](#removed-slot-id)
- [Removed slot fallback](#removed-slot-fallback)
- [Unsupported slot key](#unsupported-slot-key)
- [Invalid slot metadata](#invalid-slot-metadata)
- [Invalid slot routes](#invalid-slot-routes)
- [Invalid `intercepts`](#invalid-intercepts)
- [Empty intercept slot name](#empty-intercept-slot-name)
- [Invalid intercept config](#invalid-intercept-config)
- [Intercept slot not declared](#intercept-slot-not-declared)
- [Intercept missing view](#intercept-missing-view)
- [Intercept missing targets](#intercept-missing-targets)
- [Intercept target contains an empty route ID](#intercept-target-contains-an-empty-route-id)

## Invalid route root

### Symptom

Validation fails before checking individual routes:

```txt
Router routes must be an array.
```

### Cause

The top-level route value is not an array.

### Fix

Pass an array to `defineRoutes()` or `validateRoutes()`.

```ts
export const routes = defineRoutes([
  {
    id: 'home',
    path: '/',
    view: HomePage,
  },
] as const);
```

## Invalid route entry

### Symptom

Validation fails with:

```txt
Every route must be an object.
```

### Cause

A route entry is `null`, `undefined`, a primitive, or another non-object value.

### Fix

Each item in the route tree must be a route object.

```ts
export const routes = defineRoutes([
  {
    id: 'home',
    path: '/',
    view: HomePage,
  },
] as const);
```

## Missing route ID

### Symptom

Validation fails with:

```txt
Every route must define a non-empty string id.
```

### Cause

A route is missing `id`, has an empty `id`, or uses a non-string `id`.

### Fix

Give every route a stable non-empty string ID.

```ts
{
  id: 'users.show',
  path: '/users/{id:int}',
  view: UserPage,
}
```

## Duplicate route ID

### Symptom

Validation fails with:

```txt
Duplicate route id "home".
```

### Cause

Two routes use the same `id`. Route IDs are global across the primary route tree and slot route trees.

### Fix

Rename one route. Prefer dotted IDs for nested routes.

```ts
[
  { id: 'dashboard.home', path: '/dashboard', view: DashboardPage },
  { id: 'dashboard.reports', path: '/dashboard/reports', view: ReportsPage },
];
```

## Invalid `index`

### Symptom

Validation fails with:

```txt
Route "home" index must be a boolean when provided.
```

### Cause

`index` was provided with a non-boolean value such as `'true'`, `1`, or `{}`.

### Fix

Use `index: true` for index routes or omit `index` for normal path routes.

```ts
{
  id: 'dashboard.index',
  index: true,
  view: DashboardIndexPage,
}
```

## Invalid `path`

### Symptom

Validation fails with:

```txt
Route "home" path must be a string when provided.
```

### Cause

`path` was provided with a non-string value.

### Fix

Use a string path, omit `path` for pathless layout/group routes, or use `index: true` for index routes.

```ts
{
  id: 'users.show',
  path: '/users/{id:int}',
  view: UserPage,
}
```

## Index route declares `path`

### Symptom

Validation fails with:

```txt
Route "home" is an index route and must not define path.
```

### Cause

A route declares both `index: true` and `path`.

### Fix

Remove `path` from the index route. Put the parent path on the parent route.

```ts
{
  id: 'dashboard',
  path: '/dashboard',
  children: [
    {
      id: 'dashboard.index',
      index: true,
      view: DashboardHomePage,
    },
  ],
}
```

## Index route declares `children`

### Symptom

Validation fails with:

```txt
Route "home" is an index route and must not define children.
```

### Cause

Index routes cannot have child routes.

### Fix

Move children to a non-index parent route.

```ts
{
  id: 'settings',
  path: '/settings',
  children: [
    { id: 'settings.index', index: true, view: SettingsHomePage },
    { id: 'settings.profile', path: 'profile', view: ProfilePage },
  ],
}
```

## Invalid `children`

### Symptom

Validation fails with:

```txt
Route "home" children must be an array.
```

### Cause

`children` was provided but is not an array.

### Fix

Use an array or omit `children`.

```ts
{
  id: 'dashboard',
  path: '/dashboard',
  children: [
    { id: 'dashboard.index', index: true, view: DashboardHomePage },
  ],
}
```

## Removed route `errorFallback`

### Symptom

Validation fails with:

```txt
Route "home" declares errorFallback, but route errorFallback is no longer supported. Use error instead.
```

### Cause

The route uses the removed `errorFallback` field.

### Fix

Use route-local `error`.

```ts
{
  id: 'home',
  path: '/',
  view: HomePage,
  error: HomeErrorPage,
}
```

## Invalid `layout`

### Symptom

Validation fails with:

```txt
Route "dashboard" layout must be an object.
```

### Cause

`layout` was provided as an array, `null`, or a primitive.

### Fix

Use an object layout declaration.

```ts
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    view: DashboardLayout,
  },
  children: [{ id: 'dashboard.index', index: true, view: DashboardHomePage }],
}
```

## Invalid `search` root

### Symptom

Validation fails with:

```txt
Route "home" search configuration must be an object.
```

### Cause

`search` was provided as an array, `null`, or a primitive.

### Fix

Use a URLKit Static search descriptor object.

```ts
{
  id: 'articles.index',
  path: '/articles',
  search: {
    q: { type: 'string', optional: true },
    page: { type: 'int', default: 1 },
  },
}
```

## Invalid `meta`

### Symptom

Validation fails with:

```txt
Route "home" meta must be an object.
```

or, for slot metadata:

```txt
Route "dashboard.sidebar" meta must be an object.
```

### Cause

`meta` was provided as an array, `null`, or a primitive.

### Fix

Use an object or omit `meta`.

```ts
{
  id: 'home',
  path: '/',
  meta: {
    title: 'Home',
  },
}
```

## Unsafe `search` or `meta` key

### Symptom

Validation fails with one of:

```txt
Route "bad" search contains unsafe key "constructor".
Route "bad" meta contains unsafe key "prototype".
```

### Cause

`search` or `meta` contains `__proto__`, `constructor`, or `prototype`. These keys are rejected to prevent prototype pollution and unsafe generated contracts.

### Fix

Rename the key or nest it in a safe application-owned value outside route declarations.

```ts
{
  id: 'users.index',
  path: '/users',
  search: {
    role: { type: 'string', optional: true },
  },
  meta: {
    section: 'admin',
  },
}
```

## Invalid pathless route

### Symptom

Validation fails with:

```txt
Route "entry.redirect" must define either path or index. Pathless routes are only supported as layout/group routes with children.
```

### Cause

A route omits both `path` and `index`, but it is not a pure pathless layout/group route with children. Pathless routes cannot be directly navigable and cannot declare renderable/navigable route-local fields such as `view`, `redirect`, `search`, `hash`, `intercepts`, `middleware`, `lifecycle`, `loading`, or `error`.

### Fix

Use `path`, `index: true`, or make the route a pure group route with children.

```ts
{
  id: 'settings.group',
  children: [
    { id: 'settings.profile', path: '/settings/profile', view: ProfilePage },
  ],
}
```

For a redirect, make the route addressable:

```ts
{
  id: 'entry.redirect',
  index: true,
  redirect: { route: 'overview' },
}
```

## Empty path

### Symptom

Validation fails with:

```txt
Route "empty" defines an empty path.
```

### Cause

`path` is an empty string.

### Fix

Use `/` for the root path, a non-empty path segment for children, or omit `path` for pathless groups.

```ts
{ id: 'home', path: '/', view: HomePage }
```

## Invalid path pattern

### Symptom

Validation fails with a PathKit or URLKit path-pattern error, for example:

```txt
Unknown constraint type: "slug"
```

### Cause

The route path is not a valid PathKit pattern or references a custom constraint that has not been registered before validation.

### Fix

Fix the path pattern or register custom constraints through `defineRoutes(..., { pathConstraints })`.

```ts
import { createConstraint, defineRoutes } from '@cookbook/router';

const slug = createConstraint({
  parse(paramName, value) {
    if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
      throw new Error(`Parameter "${paramName}" must be a slug.`);
    }
  },
  verify(_paramName, params) {
    if (params) {
      throw new Error('slug does not accept parameters.');
    }
  },
  toRegExp() {
    return '[a-z0-9-]+';
  },
});

export const routes = defineRoutes(
  [{ id: 'posts.show', path: '/posts/{slug:slug}', view: PostPage }] as const,
  { pathConstraints: { slug } },
);
```

## Duplicate route path

### Symptom

Validation fails with:

```txt
Duplicate route path "/same" declared by routes "one" and "two".
```

### Cause

Two routes in the same path scope normalize to the same full path. Slot route trees have their own path scopes, so a slot route can share the same URL as the primary branch it decorates.

### Fix

Give one route a different full path, make one route an index route under a different parent, or move slot-specific UI into a slot route tree.

```ts
[
  { id: 'users.index', path: '/users', view: UsersPage },
  { id: 'users.show', path: '/users/{id:int}', view: UserPage },
];
```

## Duplicate inherited param

### Symptom

Validation fails with:

```txt
Route "teams.users" declares duplicate inherited param "id".
```

### Cause

A child route declares a path param with the same name as an inherited parent param.

### Fix

Use distinct param names across a parent-to-child branch.

```ts
{
  id: 'teams.show',
  path: '/teams/{teamId:int}',
  children: [
    {
      id: 'teams.users.show',
      path: 'users/{userId:int}',
      view: TeamUserPage,
    },
  ],
}
```

## Invalid static search descriptor

### Symptom

Validation throws `UrlKitError` with code `invalid-descriptor`, usually with route/search-param context.

### Cause

`search` is not a valid URLKit Static search descriptor. Common causes include runtime builders, invalid `optional`/`many` flags, invalid defaults, invalid enum values, invalid date/date-time formats, or runtime date codec objects.

### Fix

Use the cleaned Static descriptor object shape.

```ts
{
  id: 'articles.index',
  path: '/articles',
  search: {
    q: { type: 'string', optional: true },
    page: { type: 'int', default: 1 },
    tags: { type: 'string', many: true, optional: true },
    sort: { type: 'enum', values: ['newest', 'popular'], default: 'newest' },
    publishedOn: { type: 'date', format: 'dd-MM-yyyy', optional: true },
    startsAt: { type: 'date-time', format: "dd-MM-yyyy'T'HH:mm:ss'Z'", optional: true },
  },
}
```

Do not use runtime builders in route definitions:

```ts
// Invalid in Router static route definitions
search: {
  page: int().default(1),
}
```

Do not use runtime date codecs in Static descriptors:

```ts
// Invalid in Router static route definitions
search: {
  from: {
    type: 'date',
    format: {
      parse(value) {
        return new Date(value);
      },
      serialize(value) {
        return value.toISOString();
      },
    },
  },
}
```

Use a static format string instead.

```ts
search: {
  from: { type: 'date', format: 'dd-MM-yyyy', optional: true },
}
```

## Invalid static hash descriptor

### Symptom

Validation throws `UrlKitError` with code `invalid-descriptor`.

### Cause

`hash` is not a valid URLKit Static hash descriptor. Common causes include array shorthand, string shorthand, empty enum values, defaults outside enum values, `optional: false`, or `optional: true` combined with `default`.

### Fix

Use an object hash descriptor.

```ts
{
  id: 'articles.show',
  path: '/articles/{slug}',
  hash: {
    type: 'enum',
    values: ['comments', 'share'],
    optional: true,
  },
}
```

For a default hash, omit `optional: true`.

```ts
hash: {
  type: 'enum',
  values: ['overview', 'comments'],
  default: 'overview',
}
```

## Hash value includes `#`

### Symptom

Validation fails with:

```txt
Route "home" hash value "#profile" must not include a leading #.
```

### Cause

A static hash descriptor value or default includes the leading hash sign. Descriptor values are bare hash values.

### Fix

Remove `#` from the descriptor. Router adds `#` when building URLs.

```ts
hash: {
  type: 'enum',
  values: ['profile', 'settings'],
  optional: true,
}
```

## Invalid redirect shape

### Symptom

Validation fails with:

```txt
Route "entry" redirect must be a string or route target object.
```

### Cause

`redirect` is present but is not a string and not an object.

### Fix

Use a string href or a route target object.

```ts
{ id: 'legacy', path: '/legacy', redirect: '/new' }
```

```ts
{ id: 'entry', path: '/', redirect: { route: 'dashboard.home' } }
```

## Empty string redirect

### Symptom

Validation fails with:

```txt
Route "entry" redirect must be a non-empty string.
```

### Cause

`redirect` is an empty string.

### Fix

Provide a non-empty href or use a route target object.

```ts
{ id: 'entry', path: '/', redirect: { route: 'dashboard.home' } }
```

## Invalid redirect target

### Symptom

Validation fails with:

```txt
Route "entry" redirect.route must be a non-empty string.
```

### Cause

Object-form `redirect` is missing `route` or has an empty/non-string `route`.

### Fix

Provide the target route ID.

```ts
{
  id: 'entry',
  path: '/',
  redirect: { route: 'dashboard.home' },
}
```

## Invalid redirect params

### Symptom

Validation fails with:

```txt
Route "entry" redirect.params must be an object when provided.
```

### Cause

`redirect.params` was provided but is not an object.

### Fix

Use an object or omit `params`.

```ts
{
  id: 'legacy.user',
  path: '/u/{id:int}',
  redirect: {
    route: 'users.show',
    params: { id: 42 },
  },
}
```

## Invalid redirect search

### Symptom

Validation fails with:

```txt
Route "entry" redirect.search must be an object when provided.
```

### Cause

`redirect.search` was provided but is not an object.

### Fix

Use an object or omit `search`.

```ts
{
  id: 'articles.redirect',
  path: '/old-articles',
  redirect: {
    route: 'articles.index',
    search: { page: 1 },
  },
}
```

## Invalid redirect hash

### Symptom

Validation fails with:

```txt
Route "entry" redirect.hash must be a string or null when provided.
```

### Cause

`redirect.hash` was provided but is not a string and not `null`.

### Fix

Use a string hash value, `null`, or omit `hash`.

```ts
{
  id: 'article.redirect',
  path: '/old-article',
  redirect: {
    route: 'articles.show',
    params: { slug: 'typed-routing' },
    hash: 'comments',
  },
}
```

## Removed `layout.errorFallback`

### Symptom

Validation fails with:

```txt
Route "dashboard" declares layout.errorFallback, but layout errorFallback is no longer supported. Use layout.error instead.
```

### Cause

The layout uses the removed `layout.errorFallback` field.

### Fix

Use `layout.error`.

```ts
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    view: DashboardLayout,
    error: DashboardErrorPage,
  },
  children: [{ id: 'dashboard.index', index: true, view: DashboardHomePage }],
}
```

## Layout fallback without layout view

### Symptom

Validation fails with:

```txt
Route "standalone" declares layout.loading/layout.error, but no active layout view exists. Use route.loading/route.error for route-local fallbacks, or declare layout.view.
```

### Cause

`layout.loading` or `layout.error` is declared on a route that has no `layout.view` and no active ancestor layout view.

### Fix

For route-local fallback UI, use `loading` or `error` directly on the route.

```ts
{
  id: 'standalone',
  path: '/standalone',
  view: StandalonePage,
  loading: StandaloneLoading,
  error: StandaloneError,
}
```

For shared layout fallback UI, declare a layout view.

```ts
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    view: DashboardLayout,
    loading: DashboardLoading,
    error: DashboardError,
  },
  children: [{ id: 'dashboard.index', index: true, view: DashboardHomePage }],
}
```

## Slots without layout view

### Symptom

Validation fails with:

```txt
Route "standalone" declares layout.slots, but no active layout view exists in its ancestor tree. Slot declarations require layout.view on the same route or an ancestor route.
```

### Cause

A route declares `layout.slots`, but there is no active layout view that can render those slots.

### Fix

Declare `layout.view` on the same route or an ancestor route.

```ts
{
  id: 'dashboard',
  path: '/dashboard',
  layout: {
    view: DashboardLayout,
    slots: {
      sidebar: true,
    },
  },
  children: [{ id: 'dashboard.index', index: true, view: DashboardHomePage }],
}
```

## Invalid `layout.slots`

### Symptom

Validation fails with:

```txt
Route "dashboard" layout.slots must be an object.
```

### Cause

`layout.slots` was provided but is not an object.

### Fix

Use an object keyed by slot name.

```ts
layout: {
  view: DashboardLayout,
  slots: {
    sidebar: true,
  },
}
```

## Empty slot name

### Symptom

Validation fails with:

```txt
Route "dashboard" defines a slot with an empty name.
```

### Cause

`layout.slots` contains an empty string key.

### Fix

Use a non-empty slot name.

```ts
layout: {
  view: DashboardLayout,
  slots: {
    sidebar: true,
  },
}
```

## Slot not declared on an active layout

### Symptom

Validation fails with:

```txt
Missing slot "header" for route "users.details". Declare "layout.slots.header" on an active ancestor layout or remove the child slot declaration.
```

### Cause

A child route declares a slot that is not declared by the current layout route or an active ancestor layout.

### Fix

Declare the slot on the route that owns the layout view or remove the child slot declaration.

```ts
{
  id: 'users',
  path: '/users',
  layout: {
    view: UsersLayout,
    slots: {
      header: true,
    },
  },
  children: [
    {
      id: 'users.details',
      path: '{id:int}',
      layout: {
        slots: {
          header: { view: UserHeader },
        },
      },
      view: UserPage,
    },
  ],
}
```

## Invalid slot configuration

### Symptom

Validation fails with one of:

```txt
Route "root" declares invalid configuration for slot "sidebar". Use a view, { view?, meta?, routes? }, or true.
Route "root" defines invalid configuration for slot "sidebar".
```

### Cause

A slot value is `false`, `null`, `undefined`, an array, or another invalid value.

### Fix

Use `true`, a view value, or an object with supported keys.

```ts
layout: {
  view: AppLayout,
  slots: {
    sidebar: true,
    modal: {
      routes: [{ id: 'modal.compose', path: 'compose', view: ComposeModal }],
    },
  },
}
```

## Removed slot ID

### Symptom

Validation fails with:

```txt
Route "root" declares "layout.slots.sidebar.id", but slot IDs are no longer supported. Use the slot key as the slot identity.
```

### Cause

A slot config still declares `id`.

### Fix

Remove `id` and use the slot key as the identity.

```ts
layout: {
  view: AppLayout,
  slots: {
    sidebar: { view: SidebarFallback },
  },
}
```

## Removed slot fallback

### Symptom

Validation fails with:

```txt
Unsupported slot fallback: slot fallbacks are no longer supported on route "root". Remove "layout.slots.sidebar.fallback"; use "layout.slots.sidebar" instead.
```

### Cause

A slot config uses the removed `fallback` property.

### Fix

Put the fallback view directly on the slot config with `view`.

```ts
layout: {
  view: AppLayout,
  slots: {
    sidebar: { view: SidebarFallback },
  },
}
```

## Unsupported slot key

### Symptom

Validation fails with:

```txt
Unsupported slot key "loader" on route "root". Remove "layout.slots.sidebar.loader". Supported slot keys are "view", "meta", and "routes".
```

### Cause

A slot config contains a key other than `view`, `meta`, or `routes`.

### Fix

Remove the unsupported key or move the value to route metadata.

```ts
layout: {
  view: AppLayout,
  slots: {
    sidebar: {
      view: SidebarFallback,
      meta: { chrome: true },
    },
  },
}
```

## Invalid slot metadata

### Symptom

Validation fails with:

```txt
Route "root.sidebar" meta must be an object.
```

### Cause

`layout.slots.<name>.meta` was provided as an array, `null`, or a primitive.

### Fix

Use an object or omit slot `meta`.

```ts
layout: {
  view: AppLayout,
  slots: {
    sidebar: {
      meta: { chrome: true },
    },
  },
}
```

## Invalid slot routes

### Symptom

Validation fails with:

```txt
Route "root" slot "sidebar" routes must be an array.
```

### Cause

`layout.slots.<name>.routes` was provided but is not an array.

### Fix

Use an array of route definitions.

```ts
layout: {
  view: AppLayout,
  slots: {
    sidebar: {
      routes: [{ id: 'dashboard.sidebar.activity', path: 'activity', view: ActivityPanel }],
    },
  },
}
```

Slot routes are validated recursively. Any route validation error can also occur inside `layout.slots.<name>.routes`.

## Invalid `intercepts`

### Symptom

Validation fails with:

```txt
Route "messages" intercepts must be an object.
```

### Cause

`intercepts` was provided as an array, `null`, or a primitive.

### Fix

Use an object keyed by slot name.

```ts
intercepts: {
  modal: {
    to: ['messages.new'],
    view: ComposeMessageModal,
  },
}
```

## Empty intercept slot name

### Symptom

Validation fails with:

```txt
Route "messages" defines an intercept with an empty slot name.
```

### Cause

`intercepts` contains an empty string key.

### Fix

Use the name of a declared slot.

```ts
intercepts: {
  modal: {
    to: ['messages.new'],
    view: ComposeMessageModal,
  },
}
```

## Invalid intercept config

### Symptom

Validation fails with:

```txt
Route "messages" intercept for slot "modal" must be an object.
```

### Cause

The intercept entry is missing or is not an object.

### Fix

Use an object with `view` and `to`.

```ts
intercepts: {
  modal: {
    to: ['messages.new'],
    view: ComposeMessageModal,
  },
}
```

## Intercept slot not declared

### Symptom

Validation fails with:

```txt
Invalid intercept slot "modal" on route "messages". The route configures this intercept slot, but neither this route nor an active ancestor layout declares "layout.slots.modal". Declare the slot or remove the intercept slot configuration.
```

### Cause

The route configures an intercept for a slot that does not exist in the active layout tree.

### Fix

Declare the slot on the source route layout or an active ancestor layout.

```ts
{
  id: 'messages',
  path: '/messages',
  layout: {
    view: MessagesLayout,
    slots: {
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: ['messages.new'],
      view: ComposeMessageModal,
    },
  },
  children: [{ id: 'messages.index', index: true, view: MessagesPage }],
}
```

## Intercept missing view

### Symptom

Validation fails with:

```txt
Route "messages" intercept for slot "modal" must define view.
```

### Cause

The intercept config does not define `view`.

### Fix

Add the view rendered when the intercept is active.

```ts
intercepts: {
  modal: {
    to: ['messages.new'],
    view: ComposeMessageModal,
  },
}
```

## Intercept missing targets

### Symptom

Validation fails with:

```txt
Route "messages" intercept for slot "modal" must define at least one target route id.
```

### Cause

`to` is missing, empty, or not a string/array.

### Fix

Provide one target route ID or a non-empty array of target route IDs.

```ts
intercepts: {
  modal: {
    to: ['messages.new'],
    view: ComposeMessageModal,
  },
}
```

## Intercept target contains an empty route ID

### Symptom

Validation fails with:

```txt
Route "messages" intercept for slot "modal" defines an empty target route id.
```

### Cause

The `to` array contains an empty string.

### Fix

Remove the empty entry or replace it with a valid target route ID.

```ts
intercepts: {
  modal: {
    to: ['messages.new'],
    view: ComposeMessageModal,
  },
}
```
