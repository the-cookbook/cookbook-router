# Troubleshooting

Use this guide when routing behavior, generated contracts, examples, SSR, or tests do not behave as expected.

## Table of contents

- [Route does not match](#route-does-not-match)
- [Redirect route shows not found](#redirect-route-shows-not-found)
- [Trailing slash stays in the URL](#trailing-slash-stays-in-the-url)
- [Basename routes do not work](#basename-routes-do-not-work)
- [Intercept throws missing configuration](#intercept-throws-missing-configuration)
- [Call-site intercept throws `DataCloneError`](#call-site-intercept-throws-datacloneerror)
- [Slot default IDs are missing from contracts](#slot-default-ids-are-missing-from-contracts)
- [Generated contracts are stale](#generated-contracts-are-stale)
- [Type inference does not work](#type-inference-does-not-work)
- [SSR returns an empty root](#ssr-returns-an-empty-root)
- [SSR page has no styles](#ssr-page-has-no-styles)
- [Tests warn about React `act`](#tests-warn-about-react-act)
- [Examples still use old package behavior](#examples-still-use-old-package-behavior)

## Route does not match

Check:

- the route has an `id`
- index routes do not define `path`
- child paths are relative unless they intentionally start with `/`
- constrained params satisfy the pathkit constraint
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

For SSR, use the same custom-constraint setup in the route module used by both the server and client.

For CLI generation, keep the custom constraints in `defineRoutes(..., { pathConstraints })`. The CLI reads that option automatically; no separate flag is needed. The supported static forms are a referenced object literal (`pathConstraints: constraints`) and an inline object literal (`pathConstraints: { slug: createConstraint(...) }`). Generated contract params for custom constraints are `string`. If `pathConstraints` is built dynamically, the CLI reports that it cannot statically evaluate the declaration.

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

## Slot default IDs are missing from contracts

That is expected. Slot defaults are render defaults, not navigable routes.

Use generic outlet context typing in slot default components:

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
