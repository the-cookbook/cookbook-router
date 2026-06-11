# Troubleshooting

Use this guide when routing behavior, generated contracts, examples, SSR, or tests do not behave as expected.

## Table of contents

- [Route validation fails](#route-validation-fails)
- [Route does not match](#route-does-not-match)
- [Redirect route shows not found](#redirect-route-shows-not-found)
- [Trailing slash stays in the URL](#trailing-slash-stays-in-the-url)
- [Unknown custom path constraint](#unknown-custom-path-constraint)
- [Basename routes do not work](#basename-routes-do-not-work)
- [Intercept throws missing configuration](#intercept-throws-missing-configuration)
- [Call-site intercept throws `DataCloneError`](#call-site-intercept-throws-datacloneerror)
- [Slot fallback IDs are missing from contracts](#slot-fallback-ids-are-missing-from-contracts)
- [Generated contracts are stale](#generated-contracts-are-stale)
- [`useParams()` returns `number` for numeric path constraints](#useparams-returns-number-for-numeric-path-constraints)
- [`uuid`, `minlength`, `maxlength`, `list`, and `regex` params remain `string`](#uuid-minlength-maxlength-list-and-regex-params-remain-string)
- [Regex path constraints with `/.../` delimiters fail](#regex-path-constraints-with--delimiters-fail)
- [Custom constraint params remain `string`](#custom-constraint-params-remain-string)
- [Invalid path params fail during URLKit-backed validation](#invalid-path-params-fail-during-urlkit-backed-validation)
- [Search params parse differently after URLKit integration](#search-params-parse-differently-after-urlkit-integration)
- [Invalid optional search params break a page](#invalid-optional-search-params-break-a-page)
- [Repeated search params and `arrayFormat`](#repeated-search-params-and-arrayformat)
- [Unknown search params behavior](#unknown-search-params-behavior)
- [`useSearchParams()` does not show unknown query params](#usesearchparams-does-not-show-unknown-query-params)
- [Hook-level URL options do not change matching](#hook-level-url-options-do-not-change-matching)
- [Required search params still fail with `invalidSearch: 'recover'`](#required-search-params-still-fail-with-invalidsearch-recover)
- [Required `many` search params fail when missing](#required-many-search-params-fail-when-missing)
- [Boolean search values like `1` or `yes` are rejected](#boolean-search-values-like-1-or-yes-are-rejected)
- [Date or date-time values look shifted](#date-or-date-time-values-look-shifted)
- [Date or date-time format is rejected](#date-or-date-time-format-is-rejected)
- [Runtime date codecs are rejected in route definitions](#runtime-date-codecs-are-rejected-in-route-definitions)
- [Defaulted search or hash values appear or disappear in generated hrefs](#defaulted-search-or-hash-values-appear-or-disappear-in-generated-hrefs)
- [Hash validation failures](#hash-validation-failures)
- [Hash descriptor values with `#` fail validation](#hash-descriptor-values-with-fail-validation)
- [Generated contracts do not match expected URL state](#generated-contracts-do-not-match-expected-url-state)
- [Custom path constraints are not registered during CLI generation](#custom-path-constraints-are-not-registered-during-cli-generation)
- [Static extraction does not support URLKit runtime builders](#static-extraction-does-not-support-urlkit-runtime-builders)
- [JSDoc hovers are broad with generic `defineRoutes`](#jsdoc-hovers-are-broad-with-generic-defineroutes)
- [Type inference does not work](#type-inference-does-not-work)
- [SSR returns an empty root](#ssr-returns-an-empty-root)
- [SSR page has no styles](#ssr-page-has-no-styles)
- [Tests warn about React `act`](#tests-warn-about-react-act)
- [Examples still use stale package builds](#examples-still-use-stale-package-builds)
- [Route file extraction fails on computed values](#route-file-extraction-fails-on-computed-values)

## Route validation fails

`defineRoutes()`, `validateRoutes()`, `createRouter()`, and CLI generation all validate route definitions. For the complete list of validation errors with symptoms, causes, and fixes, see [Route validation errors](route-validation-errors.md).

Start with that catalog when the error mentions route IDs, paths, layout slots, intercepts, redirects, search descriptors, hash descriptors, duplicate params, or unsafe keys.

## Route does not match

Check:

- the route has an `id`
- index routes do not define `path`
- nested child paths are composed with their parent path, even when the child path starts with `/`
- constrained params satisfy the registered URLKit/PathKit constraint. See [Path routes and constraints](path-routes.md) for built-in constraint syntax.
- `basename` is configured when the app is mounted under a URL prefix
- `pathOptions.prune` is not set to `false` when you expect slash cleanup

Use router matching directly in a test:

```ts
expect(router.match('/blog/articles/my-post')?.route.id).toBe('blog.articles.show');
```

## Redirect route shows not found

For entry redirects such as:

```tsx
{
  id: 'entry',
  path: '/',
  redirect: { route: 'dashboard' },
}
```

call `router.resolveCurrent()` before the initial render:

```tsx
await router.resolveCurrent();
createRoot(root).render(<RouterProvider router={router} fallback={<NotFound />} />);
```

If the app is running from built package outputs inside the monorepo, rebuild packages:

```sh
pnpm build:packages
```

## Trailing slash stays in the URL

The default path cleanup is:

```ts
pathOptions: {
  prune: 'all',
}
```

This canonicalizes matched paths like `/gallery/` to `/gallery`. If it does not happen, check whether the app is using stale built package output or whether you opted out:

```ts
createRouter({ routes, pathOptions: { prune: false } });
```

## Unknown custom path constraint

A route such as `/posts/{slug:slug}` only validates after `slug` has been registered.

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

createRouter({ routes });
```

For SSR, use the same custom-constraint setup in the route module used by both the server and client. `defineRoutes(..., { pathConstraints })` and `createRouter({ pathConstraints })` both forward constraints to URLKit before route URL contracts are used.

## Basename routes do not work

Configure basename once on the router:

```ts
createRouter({ routes, basename: '/foo' });
```

Do not include the basename in route paths. Use `/blog`, not `/foo/blog`.

Links should generate `/foo/...`, while route config and intercept patterns remain app-relative.

## Intercept throws missing configuration

For configured intercepts, the source route must declare the slot and destination pattern.

```tsx
intercepts: {
  modal: {
    to: ['articles/{slug}'],
    view: ArticleModal,
  },
}
```

The active layout tree must also render the target slot:

```tsx
<Slot name="modal" />
```

If the current route does not own a configured intercept, use call-site interception:

```tsx
<Link intercept={{ slot: 'modal', view: ArticleModal }} ... />
```

## Call-site intercept throws `DataCloneError`

Browser history state cannot store functions. Current call-site intercept support stores a clone-safe view key in history and keeps the view in an in-memory registry.

If you still see `DataCloneError`, rebuild packages and restart the dev server:

```sh
pnpm build:packages
```

Also avoid putting function values in custom `history.state`.

## Slot fallback IDs are missing from contracts

That is expected. Slot fallbacks are render defaults, not navigable routes.

Use generic outlet context typing in fallback components:

```tsx
const context = useOutletContext<{ user: string }>();
```

Slot route IDs under `layout.slots.<name>.routes` are generated because they are real route definitions.

## Generated contracts are stale

Regenerate:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

In development, use watch mode. It generates once, keeps running, and regenerates when the route file changes:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
```

## `useParams()` returns `number` for numeric path constraints

This is expected URLKit-backed behavior.

```tsx
{
  id: 'users.show',
  path: '/users/{id:int}',
}
```

```ts
const params = useParams('users.show');
params.id; // number
```

Use numeric params in links, hrefs, navigation, tests, middleware assumptions, and generated-contract assertions:

```tsx
<Link to="users.show" params={{ id: 42 }} />
```

`{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` also parse to `number`.

## `uuid`, `minlength`, `maxlength`, `list`, and `regex` params remain `string`

These constraints validate string shape or length. They do not make the parsed value numeric:

```tsx
{
  id: 'articles.show',
  path: '/articles/{slug:minlength(3):maxlength(50)}',
}
```

```ts
const params = useParams('articles.show');
params.slug; // string
```

Use `min(...)` and `max(...)` for numeric bounds. Use `minlength(...)` and `maxlength(...)` for string length.

## Regex path constraints with `/.../` delimiters fail

PathKit expects a raw regex source inside `regex(...)`, not a JavaScript regex literal.

```txt
/posts/{slug:regex(/[a-z0-9-]+/)}  // invalid
/posts/{slug:regex([a-z0-9-]+)}    // valid
```

Escape backslashes in TypeScript string literals when needed:

```ts
path: '/scores/{id:regex(\\d):min(1)}';
```

## Custom constraint params remain `string`

Custom constraints validate shape but generate and expose `string` params unless the same constraint chain also includes a numeric built-in constraint.

```tsx
{
  id: 'posts.show',
  path: '/posts/{slug:slug}',
}
```

```ts
const params = useParams('posts.show');
params.slug; // string
```

## Invalid path params fail during URLKit-backed validation

Href generation, matching, resolving, and navigation now pass path params through URLKit-backed route URL contracts. Invalid values fail before the route is committed.

```ts
router.href('users.show', { params: { id: 'abc' } }); // throws for {id:int}
router.match('/users/abc'); // null for {id:int}
```

If the path uses a custom constraint, confirm the constraint is registered before route validation and router creation.

## Search params parse differently after URLKit integration

Search values now follow the route's URLKit-backed Router static descriptors.

```ts
search: {
  page: { type: 'int', default: 1 },
  tags: { type: 'string', many: true, optional: true },
}
```

`page` is a `number`, and `tags` is a `readonly string[]` when present. Update UI code that previously normalized every search value as `string | readonly string[]`.

## Invalid optional search params break a page

Use `invalidSearch` when optional query-string state should not take down a route. This is usually the right behavior for dashboards, tables, filters, and pagination.

```ts
const router = createRouter({
  routes,
  url: {
    arrayFormat: 'repeat',
    invalidSearch: 'recover',
  },
});
```

For this route:

```ts
search: {
  page: { type: 'number', default: 1 },
  pageSize: { type: 'number', optional: true },
}
```

`/overview?page=a&pageSize=10` parses as `{ page: 1, pageSize: 10 }` with the default `invalidSearch: 'recover'`, because `page` has a descriptor default. Invalid required fields still surface as errors.

Use `invalidSearch: 'error'` for strict apps that should render route error fallbacks for malformed declared search params. Use `invalidSearch: 'no-match'` when malformed search should reject that route candidate and continue fallback/not-found matching.

## Repeated search params and `arrayFormat`

`arrayFormat` controls repeated values.

```ts
createRouter({ routes, url: { arrayFormat: 'repeat' } });
```

`repeat` reads and writes `?tags=a&tags=b`. `comma` reads `?tags=a,b` and writes `?tags=a%2Cb`. For URL building, precedence is call-site `url`, then route-level `url`, then router-level `url`, then URLKit defaults. State-reading hooks consume already-resolved router state and do not accept `url` options.

## Unknown search params behavior

Only declared route `search` keys are part of generated contracts. Unknown keys are query-string keys that are not declared by the matched route. The effective `unknownSearch` policy controls them.

```ts
createRouter({
  routes,
  url: {
    unknownSearch: 'strip',
  },
});
```

Supported modes are:

| Mode         | Behavior                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------- |
| `'strip'`    | Default. Route matches and unknown keys are omitted from router state.                       |
| `'preserve'` | Route matches and unknown keys are exposed separately as `unknownSearch`.                    |
| `'error'`    | Path route remains matched and the unknown-key failure is exposed through route error state. |

For `/overview?page=0&utm_source=website`, with `unknownSearch: 'preserve'`, declared search and unknown search are separate:

```ts
match.search;
// { page: 0 }

match.unknownSearch;
// { utm_source: 'website' }
```

## `useSearchParams()` does not show unknown query params

`useSearchParams()` returns only declared, typed route search. It does not merge preserved unknown keys into the declared search contract.

```tsx
const search = useSearchParams('overview');
const unknownSearch = useUnknownSearchParams();

search;
// { page: 0 }

unknownSearch;
// { utm_source: 'website' }
```

Declare a key in the route `search` descriptor when it is application state. Use `useUnknownSearchParams()` for URLKit-preserved pass-through keys.

## Hook-level URL options do not change matching

State-reading hooks such as `useParams()`, `useSearchParams()`, and `useHashParams()` consume already-resolved router state. They do not accept `url` options and cannot change route matching, error fallback behavior, or not-found behavior.

Configure route-resolution policies on the router, route definition, explicit match calls, or static router creation:

```ts
createRouter({
  routes,
  url: {
    invalidSearch: 'recover',
    unknownSearch: 'preserve',
    invalidHash: 'recover',
  },
});
```

## Required search params still fail with `invalidSearch: 'recover'`

`invalidSearch: 'recover'` maps to URLKit's invalid-field omit behavior. It can omit invalid optional/defaulted fields, but it does not turn required fields into optional fields.

```ts
search: {
  page: { type: 'int' },
}
```

This URL still fails because `page` is required:

```txt
/reports?page=abc
```

Choose the route contract you actually want:

```ts
// Missing or invalid page can be omitted.
search: {
  page: { type: 'int', optional: true },
}
```

```ts
// Missing or invalid page can fall back to a normalized default.
search: {
  page: { type: 'int', default: 1 },
}
```

Use `invalidSearch: 'error'` when malformed required search state should render route error UI. Use `invalidSearch: 'no-match'` when that route candidate should be rejected.

## Required `many` search params fail when missing

A repeated search field is still required unless it declares `optional: true` or `default`.

```ts
search: {
  tags: { type: 'string', many: true },
}
```

This requires at least one `tags` value in the URL or structured build input. For optional filters, declare the field as optional:

```ts
search: {
  tags: { type: 'string', many: true, optional: true },
}
```

For default filters, provide an array default:

```ts
search: {
  tags: { type: 'string', many: true, default: ['typescript'] },
}
```

## Boolean search values like `1` or `yes` are rejected

URLKit parses boolean search fields strictly. Only serialized `true` and `false` are valid.

```ts
search: {
  featured: { type: 'boolean', optional: true },
}
```

Valid URLs:

```txt
/products?featured=true
/products?featured=false
```

Invalid URLs:

```txt
/products?featured=1
/products?featured=yes
/products?featured=on
```

Use an enum if the public URL must accept other words:

```ts
search: {
  featured: { type: 'enum', values: ['yes', 'no'], optional: true },
}
```

## Date or date-time values look shifted

Router search descriptors delegate date parsing to URLKit. Static `date` and `date-time` values parse into JavaScript `Date` objects using UTC fields.

```ts
search: {
  publishedOn: { type: 'date', format: 'dd-MM-yyyy', optional: true },
  startsAt: {
    type: 'date-time',
    format: "dd-MM-yyyy'T'HH:mm:ss'Z'",
    optional: true,
  },
}
```

If a value looks one day or a few hours off, the problem is usually local-time display, not URL parsing. Avoid assertions such as:

```ts
search.startsAt?.getHours();
search.startsAt?.toString();
```

Use UTC-safe checks instead:

```ts
search.startsAt?.toISOString();
search.startsAt?.getUTCHours();
search.publishedOn?.getUTCDate();
```

`date` fields represent UTC calendar dates. `date-time` fields represent strict UTC instants. Custom static format strings also parse and serialize with UTC fields.

## Date or date-time format is rejected

URLKit validates static format strings before Router uses the route. Unsupported, ambiguous, or local-time-like tokens fail with an `invalid-descriptor` URLKit error.

Common mistakes:

```ts
search: {
  from: { type: 'date', format: 'DD-MM-yyyy', optional: true },
  at: { type: 'date-time', format: 'yyyy-MM-dd hh:mm:ss', optional: true },
}
```

Use URLKit's strict UTC token subset:

```ts
search: {
  from: { type: 'date', format: 'dd-MM-yyyy', optional: true },
  at: {
    type: 'date-time',
    format: "yyyy-MM-dd'T'HH:mm:ss'Z'",
    optional: true,
  },
}
```

Rules to check:

- `date` formats require `yyyy`, `MM`, and `dd` and cannot include time tokens.
- `date-time` formats require `yyyy`, `MM`, `dd`, `HH`, `mm`, and `ss`; `SSS` is optional.
- Literal letters such as `T` and `Z` must be single-quoted.
- Tokens such as `YY`, `YYYY`, `D`, `DD`, `h`, `a`, timezone names, and locale month names are not supported.
- If a `date-time` format omits `SSS`, URLKit rejects serializing a `Date` with non-zero milliseconds to avoid precision loss.

## Runtime date codecs are rejected in route definitions

Router route definitions are Static descriptors. They must be plain data so validation, matching, URL generation, and CLI extraction can analyze them without executing app code.

This is invalid in Router route definitions:

```ts
search: {
  from: date({ format: 'dd-MM-yyyy' }),
}
```

This is also invalid:

```ts
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

Use a static format string instead:

```ts
search: {
  from: { type: 'date', format: 'dd-MM-yyyy', optional: true },
}
```

Custom runtime codecs belong in direct URLKit runtime contracts, not Router route definitions.

## Defaulted search or hash values appear or disappear in generated hrefs

URLKit build options control whether values equal to descriptor defaults are serialized.

```ts
search: {
  page: { type: 'int', default: 1 },
}

hash: {
  type: 'enum',
  values: ['overview', 'details'],
  default: 'overview',
}
```

By default, URLKit includes defaulted values during build:

```ts
router.href({ route: 'products', search: { page: 1 }, hash: 'overview' });
// '/products?page=1#overview'
```

Use `defaults: 'omit'` at the router, route, or call site to omit values equal to normalized defaults:

```ts
router.href({
  route: 'products',
  search: { page: 1 },
  hash: 'overview',
  url: { defaults: 'omit' },
});
// '/products'
```

If an expected default is still present, check the effective `url.defaults` precedence: call-site, then route-level, then router-level, then URLKit default.

## Hash validation failures

When a route declares hash values, generated hrefs and route state are URLKit-backed.

```ts
hash: { type: 'enum', values: ['comments', 'share'], optional: true };
```

Use `hash: 'comments'` or `hash: '#comments'` when building hrefs or navigating. Router normalizes either input to one leading `#` in the generated URL.

A hash outside the declared descriptor fails through URLKit-backed validation or does not match the route's declared hash contract. Configure `invalidHash` where the route should recover, surface an error, or no-match on malformed hash state.

## Hash descriptor values with `#` fail validation

Hash descriptor values are bare hash values. They must not include the leading number sign.

Invalid route definition:

```ts
hash: {
  type: 'enum',
  values: ['#comments', '#share'],
  optional: true,
}
```

Valid route definition:

```ts
hash: {
  type: 'enum',
  values: ['comments', 'share'],
  optional: true,
}
```

The leading `#` belongs in the serialized URL only. Router adds it while building hrefs.

## Generated contracts do not match expected URL state

Regenerate after changing `path`, `search`, `hash`, custom constraints, or route-level `url` options:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

Generated contracts should show `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` params as `number`, `uuid`, `minlength`, `maxlength`, `list`, `regex`, and custom constraints as `string`, URLKit-compatible search descriptors as parsed types, and route-level `url` options in `manifest.json` when configured.

## Custom path constraints are not registered during CLI generation

Declare custom constraints in the second `defineRoutes` argument so the CLI can extract and register them before validation and generation.

```ts
export const routes = defineRoutes([{ id: 'posts.show', path: '/posts/{slug:slug}' }], {
  pathConstraints: { slug },
});
```

Avoid registering constraints only through side effects in files the CLI cannot statically evaluate.

## Static extraction does not support URLKit runtime builders

CLI-consumed route files must remain statically analyzable. Do not use runtime builders like `int().default(1)` in static route definitions unless the CLI explicitly supports them. Use static descriptors instead:

```ts
search: {
  page: { type: 'int', default: 1 },
}
```

## JSDoc hovers are broad with generic `defineRoutes`

Generic `defineRoutes([...])` calls can show broad hover text because TypeScript displays the generic route-definition surface instead of the narrowed generated contract. Run the CLI and include `.cookbook-router/register.d.ts` in `tsconfig.json`; use generated `RouteParams`, `RouteSearch`, and hook/router call sites for precise app-specific types.

## Type inference does not work

Check:

- `.cookbook-router/register.d.ts` exists
- `.cookbook-router/contracts.ts` exists
- both files are included by `tsconfig.json`
- your editor TypeScript server has restarted
- imports come from package roots, not deep paths

## SSR returns an empty root

Your dev server is probably serving `index.html` directly instead of calling the SSR renderer. Use the SSR example pattern: a Vite dev plugin/middleware that calls `renderRequest()` for document requests.

## SSR page has no styles

Server HTML must include CSS links needed by the first render.

```html
<link rel="stylesheet" href="/src/styles.css" />
```

Production frameworks usually emit built CSS asset URLs from a manifest.

## Tests warn about React `act`

If you call router navigation methods directly in a test, wrap the call with React Testing Library or React `act` helpers when it causes a provider state update.

For click-driven navigation, prefer `fireEvent.click()` or `userEvent.click()` and then `waitFor()` assertions.

## Examples still use stale package builds

Examples consume workspace packages. After package source changes, run:

```sh
pnpm build:packages
```

Then restart the example dev server.

## Route file extraction fails on computed values

The CLI route extractor is intentionally static. Keep codegen-relevant route fields inline and literal where possible. If a route file builds IDs, paths, search schemas, hash values, metadata, children, slot configs, or redirects through imported constants or helper functions, move those values inline or use a simpler route file for generation.
