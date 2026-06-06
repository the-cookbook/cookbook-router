# Troubleshooting

Use this guide when routing behavior, generated contracts, examples, SSR, or tests do not behave as expected.

## Table of contents

- [Route does not match](#route-does-not-match)
- [Redirect route shows not found](#redirect-route-shows-not-found)
- [Trailing slash stays in the URL](#trailing-slash-stays-in-the-url)
- [Basename routes do not work](#basename-routes-do-not-work)
- [Intercept throws missing configuration](#intercept-throws-missing-configuration)
- [Call-site intercept throws `DataCloneError`](#call-site-intercept-throws-datacloneerror)
- [Slot fallback IDs are missing from contracts](#slot-fallback-ids-are-missing-from-contracts)
- [Generated contracts are stale](#generated-contracts-are-stale)
- [`useParams()` returns `number` for `{id:int}`](#useparams-returns-number-for-idint)
- [Custom constraint params remain `string`](#custom-constraint-params-remain-string)
- [Invalid path params fail during URLKit-backed validation](#invalid-path-params-fail-during-urlkit-backed-validation)
- [Search params parse differently after URLKit integration](#search-params-parse-differently-after-urlkit-integration)
- [Invalid optional search params break a page](#invalid-optional-search-params-break-a-page)
- [Repeated search params and `arrayFormat`](#repeated-search-params-and-arrayformat)
- [Unknown search params behavior](#unknown-search-params-behavior)
- [Hash validation failures](#hash-validation-failures)
- [Generated contracts do not match expected URL state](#generated-contracts-do-not-match-expected-url-state)
- [Custom path constraints are not registered during CLI generation](#custom-path-constraints-are-not-registered-during-cli-generation)
- [Static extraction does not support URLKit runtime builders](#static-extraction-does-not-support-urlkit-runtime-builders)
- [JSDoc hovers are broad with generic `defineRoutes`](#jsdoc-hovers-are-broad-with-generic-defineroutes)
- [Type inference does not work](#type-inference-does-not-work)
- [SSR returns an empty root](#ssr-returns-an-empty-root)
- [SSR page has no styles](#ssr-page-has-no-styles)
- [Tests warn about React `act`](#tests-warn-about-react-act)
- [Examples still use old package behavior](#examples-still-use-old-package-behavior)

## Route does not match

Check:

- the route has an `id`
- index routes do not define `path`
- nested child paths are composed with their parent path, even when the child path starts with `/`
- constrained params satisfy the registered URLKit/PathKit constraint
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
    component: ArticleModal,
  },
}
```

The active layout tree must also render the target slot:

```tsx
<Slot name="modal" />
```

If the current route does not own a configured intercept, use call-site interception:

```tsx
<Link intercept={{ slot: 'modal', component: ArticleModal }} ... />
```

## Call-site intercept throws `DataCloneError`

Browser history state cannot store functions. Current call-site intercept support stores a clone-safe component key in history and keeps the component in an in-memory registry.

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

## `useParams()` returns `number` for `{id:int}`

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

`{value:range(1,10)}` also parses to `number`.

## Custom constraint params remain `string`

Custom constraints validate shape but generate and expose `string` params unless URLKit supports typed static inference for that custom constraint.

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

Search values now follow the route's URLKit-compatible static descriptors.

```ts
search: {
  page: { value: 'int', default: 1 },
  tags: { value: 'string', type: 'many', optional: true },
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
  page: { value: 'number', default: 1, optional: true },
  pageSize: { value: 'number', optional: true },
}
```

`/overview?page=a&pageSize=10` parses as `{ page: 1, pageSize: 10 }` with the default `invalidSearch: 'recover'`, because `page` has a descriptor default. Invalid fields without defaults are treated as missing.

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

## Hash validation failures

When a route declares hash values, generated hrefs and route state are URLKit-backed.

```ts
hash: ['comments', 'share'];
```

Use `hash: 'comments'` or `hash: '#comments'`. A hash outside the declared descriptor fails through URLKit-backed validation or does not match the route's declared hash contract.

## Generated contracts do not match expected URL state

Regenerate after changing `path`, `search`, `hash`, custom constraints, or route-level `url` options:

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
```

Generated contracts should show `{id:int}`, `{price:decimal}` and `{value:range}` params as `number`, custom constraints as `string`, URLKit-compatible search descriptors as parsed types, and route-level `url` options in `manifest.json` when configured.

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
  page: { value: 'int', default: 1 },
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

## Examples still use old package behavior

Examples consume workspace packages. After package source changes, run:

```sh
pnpm build:packages
```

Then restart the example dev server.

## Route file extraction fails on computed values

The CLI route extractor is intentionally static. Keep codegen-relevant route fields inline and literal where possible. If a route file builds IDs, paths, search schemas, hash values, metadata, children, slot configs, or redirects through imported constants or helper functions, move those values inline or use a simpler route file for generation.
