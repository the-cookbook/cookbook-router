# Navigation

Cookbook Router navigation is route-ID based. Paths declare URL matching; route IDs drive href generation, links, programmatic navigation, redirects, and generated type inference. URLKit builds and parses params, search, and hash for these route operations.

## Table of contents

- [Href generation](#href-generation)
- [Programmatic navigation](#programmatic-navigation)
- [React links](#react-links)
- [Active links](#active-links)
- [Search and hash](#search-and-hash)
- [URL options](#url-options)
- [Redirects](#redirects)
- [Basename](#basename)
- [Interception](#interception)
- [Browser behavior](#browser-behavior)
- [Navigation state](#navigation-state)
- [Common edge cases](#common-edge-cases)

## Href generation

Use `router.href()` to generate a URL from a route ID.

```ts
const href = router.href({
  route: 'users.show',
  params: { id: 42 },
  search: { tab: 'settings' },
  hash: 'profile',
});
```

Generated URL:

```txt
/users/42?tab=settings#profile
```

`{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` params use numbers in generated contracts and router state. `uuid`, `minlength`, `maxlength`, `list`, `regex`, unconstrained params, wildcards, and custom constraints remain strings unless the same constraint chain also includes a numeric built-in constraint. See [Path routes and constraints](path-routes.md) for all built-in constraints.

The two-argument form is also supported:

```ts
const href = router.href('users.show', {
  params: { id: 42 },
});
```

Use `router.resolve()` when you need a parsed `RouterLocation`.

```ts
const location = router.resolve({
  route: 'users.show',
  params: { id: 42 },
});

location.pathname; // /users/42
location.href; // /users/42
```

## Programmatic navigation

```ts
await router.navigate.to({
  route: 'users.show',
  params: { id: 42 },
});

await router.navigate.replace({
  route: 'users.show',
  params: { id: 43 },
});

router.navigate.back();
router.navigate.forward();
router.navigate.go(-2);
```

- `to()` pushes a history entry.
- `replace()` replaces the current entry.
- `back()`, `forward()`, and `go(delta)` delegate to the configured history.

## React links

`Link` renders a real `<a>` element.

```tsx
import { Link } from '@cookbook/router-react';

<Link to="users.show" params={{ id: 42 }} search={{ tab: 'settings' }} hash="profile">
  User 42
</Link>;
```

`route` and `to` are aliases. Prefer `to` in React code because it reads like a link target.

Use `replace` for replace navigation:

```tsx
<Link to="settings" replace>
  Settings
</Link>
```

Use `href` for literal anchors that are not route-driven:

```tsx
<Link href="https://example.com/docs" target="_blank" rel="noreferrer">
  External docs
</Link>
```

## Active links

`NavLink` computes active state from the current location.

```tsx
import { NavLink } from '@cookbook/router-react';

<NavLink to="blog.articles" end>
  {({ isActive }) => <span data-active={isActive}>Articles</span>}
</NavLink>;
```

- With `end`, the current `href` must match exactly.
- Without `end`, a path prefix match is active.
- Active links receive `aria-current="page"` unless you already supplied `aria-current`.

## Search and hash

Search fields are serialized into the query string.

```ts
router.href({
  route: 'blog.articles',
  search: { query: 'routing' },
});
```

Hash values may be passed with or without `#`.

```ts
router.href({ route: 'articles.show', params: { slug }, hash: 'comments' });
router.href({ route: 'articles.show', params: { slug }, hash: '#comments' });
```

Both produce `#comments`.

Undefined and null search values are omitted from generated URLs. Search and hash are parsed through URLKit in `router.match()`, `router.resolve()`, middleware contexts, lifecycle contexts, and React hooks.

### URL options

URL options can be configured globally on the router, per route, or on URL-building call sites. Route-resolution options include `arrayFormat`, `invalidSearch`, `invalidHash`, and `unknownSearch`. URL-building APIs such as `router.href()`, `router.navigate.to()`, `useHref()`, `Link`, and `NavLink` accept build options such as `arrayFormat` and `defaults`.

```ts
const router = createRouter({
  routes,
  url: { arrayFormat: 'repeat' },
});

const href = router.href('products', {
  search: { tags: ['router', 'typescript'] },
  url: { arrayFormat: 'comma' },
});
```

For URL building, precedence is call-site `url`, then route-level `url`, then router-level `url`, then URLKit defaults. `repeat` writes `?tags=router&tags=typescript`; `comma` writes `?tags=router%2Ctypescript`.

`invalidSearch` and `invalidHash` support `'recover'`, `'no-match'`, and `'error'`. The default is `'recover'`: URLKit omits invalid optional/defaulted values when possible, descriptor defaults apply when declared, and required invalid values still surface as errors. `'no-match'` rejects the route candidate and continues fallback/not-found matching. `'error'` keeps the path route matched and exposes the parse failure through router error state. `unknownSearch` supports `'strip'`, `'preserve'`, and `'error'`; its default is `'strip'`. Use `'preserve'` when undeclared query keys should remain available as `unknownSearch` on the match.

## Redirects

Route redirects are declared in route config.

```tsx
{
  id: 'entry',
  path: '/',
  redirect: {
    route: 'blog.index',
  },
}
```

Middleware redirects are returned from middleware.

```ts
const requireAuth = ({ route, location, redirect }) => {
  if (route.route.route.meta?.requiresAuth) {
    return redirect(`/blog/login?redirect=${encodeURIComponent(location.href)}`);
  }
};
```

String redirects are literal hrefs. Absolute hrefs are treated as external browser redirects:

```tsx
{
  id: 'external-docs',
  path: '/docs',
  redirect: 'https://docs.example.com',
}
```

Use route-object redirects for app routes when possible because they compose with `basename`, params, search, and hash.

## Basename

A basename prefixes generated hrefs and visible browser URLs.

```ts
const router = createRouter({
  routes,
  basename: '/foo',
});
```

```ts
router.href({ route: 'blog.index' }); // /foo/blog
router.match('/foo/blog'); // matches blog.index
```

Configured intercepts compare against app paths after basename stripping, so route config should not include the basename.

`router.match()` can also validate full hrefs and preserve parsed search/hash values:

```ts
const matchedRedirect = router.match('/users/eddie-lake?tab=activity#top');

if (matchedRedirect) {
  await router.navigate.replace(matchedRedirect.id, {
    params: matchedRedirect.params,
    search: matchedRedirect.search,
    hash: matchedRedirect.hash,
  });
}
```

## Interception

Configured interception:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept="modal">
  Read in modal
</Link>
```

Call-site interception:

```tsx
<Link to="blog.articles.show" params={{ slug }} intercept={{ slot: 'modal', view: ArticleModal }}>
  Preview
</Link>
```

Call-site intercept state stored in browser history is clone-safe. The view reference is held in memory for the current app session, so forward navigation can restore it during the same runtime session. A refresh or direct visit renders the canonical page.

## Browser behavior

`Link` preserves normal browser behavior for:

- already prevented events
- non-left clicks
- `meta`, `ctrl`, `alt`, or `shift` clicks
- `target` values other than `_self`
- `download` links
- external `http` or `https` links
- `mailto:` and `tel:` links

Unmodified same-origin route clicks are intercepted and routed through `router.navigate`.

## Navigation state

Use `useNavigation()` to read transition state.

```tsx
const navigation = useNavigation();

return navigation === 'pending' ? <Spinner /> : null;
```

The router navigation states are:

```txt
idle
pending
redirecting
blocked
error
```

## Common edge cases

- Missing params throw during href generation.
- Unknown route IDs throw during href generation and navigation.
- Invalid constrained params fail compilation or matching.
- Middleware returning `false` or `cancel()` blocks navigation without committing the URL.
- Redirect loops fail after `maxRedirectDepth` redirects.
- Browser history state must not contain functions. Use route IDs or call-site intercepts, not custom function values in history state.
- If examples keep using old behavior after package source changes, rebuild packages with `pnpm build:packages`.
