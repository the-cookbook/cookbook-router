# Search and hash

Search and hash declarations describe URL state for runtime parsing, href/navigation building, and generated contracts. `@cookbook/router` delegates this URL-state work to `@cookbook/urlkit`.

## Table of contents

- [Declare search fields](#declare-search-fields)
- [Generate search URLs](#generate-search-urls)
- [Read search values](#read-search-values)
- [Array format](#array-format)
- [Invalid search params](#invalid-search-params)
- [Unknown search params](#unknown-search-params)
- [Read preserved unknown search params](#read-preserved-unknown-search-params)
- [Declare hash values](#declare-hash-values)
- [Generate hash URLs](#generate-hash-urls)
- [Read hash values](#read-hash-values)
- [Runtime behavior](#runtime-behavior)
- [Static extraction](#static-extraction)
- [Best practices](#best-practices)

## Declare search fields

Use URLKit-compatible static descriptors in route definitions.

```tsx
{
  id: 'articles.index',
  path: '/articles',
  search: {
    query: { value: 'string', optional: true },
    page: { value: 'int', default: 1 },
    filters: { value: 'string', type: 'many', optional: true },
    featured: { value: 'boolean', optional: true },
  },
  component: ArticlesPage,
}
```

The generated contract and runtime state follow URLKit parsed-value semantics:

```ts
type ArticlesSearch = {
  query?: string;
  page: number;
  filters?: readonly string[];
  featured?: boolean;
};
```

`int` and `number` parse to `number`; `boolean` parses to `boolean`; `type: 'many'` parses repeated values according to the effective `arrayFormat`.

## Generate search URLs

```ts
router.href({
  route: 'articles.index',
  search: {
    query: 'routing',
    page: 2,
    filters: ['ssr', 'react'],
  },
});
```

With the default repeated-key format, the generated URL is:

```txt
/articles?filters=ssr&filters=react&page=2&query=routing
```

Undefined and null search values are omitted.

## Read search values

```tsx
import { useSearchParams } from '@cookbook/router-react';

export function ArticlesPage() {
  const search = useSearchParams('articles.index');
  const query = search.query ?? '';

  return <p>Search: {query}</p>;
}
```

`useSearchParams()` and `useSearch()` read the declared URLKit-parsed search state from the current router match. They do not accept `url` options and do not re-parse the URL with different matching policies. Router middleware, lifecycle hooks, `router.match()`, and `router.resolve()` receive the same declared parsed values.

## Array format

Configure `arrayFormat` globally, per route, or on URL-building call sites such as `router.href()`, `router.navigate.to()`, `useHref()`, `Link`, and `NavLink`.

```ts
const router = createRouter({
  routes,
  url: { arrayFormat: 'repeat' },
});
```

```tsx
{
  id: 'products',
  path: '/products',
  search: {
    tags: { value: 'string', type: 'many', optional: true },
  },
  url: { arrayFormat: 'comma' },
}
```

```tsx
<Link to="products" search={{ tags: ['router', 'typescript'] }} url={{ arrayFormat: 'repeat' }}>
  Products
</Link>
```

Precedence is:

1. URL-building call-site `url` for href/navigation/link creation
2. route-level `url`
3. router-level `url`
4. URLKit default

`repeat` writes `?tags=router&tags=typescript`. `comma` writes `?tags=router%2Ctypescript` and parses `?tags=router,typescript` as `['router', 'typescript']`.

## Invalid search params

Search params are commonly edited by users or left behind by old links. Cookbook Router therefore exposes `invalidSearch` to control how URLKit-backed search parsing handles malformed declared values.

```ts
const router = createRouter({
  routes,
  url: {
    arrayFormat: 'repeat',
    invalidSearch: 'recover',
  },
});
```

Supported modes are:

| Mode         | Behavior                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `'recover'`  | Keep the route matched. Treat invalid values as missing; descriptor defaults apply when declared. |
| `'no-match'` | Reject that route candidate and continue normal fallback/not-found matching.                      |
| `'error'`    | Keep the path route matched and surface the parse failure through router error state.             |

The default is `'recover'`. This applies to optional, defaulted, and required search fields because search is URL state, not route identity.

For example:

```ts
search: {
  page: { value: 'number', default: 1, optional: true },
  pageSize: { value: 'number', optional: true },
}
```

With `invalidSearch: 'recover'`, `/overview?page=a&pageSize=10` parses as:

```ts
{ page: 1, pageSize: 10 }
```

With `invalidSearch: 'error'`, the same URL keeps the path route matched and exposes the parse failure through router error state. With `invalidSearch: 'no-match'`, that route candidate is rejected and normal fallback/not-found matching continues.

## Invalid hash values

`invalidHash` uses the same policy model as `invalidSearch`:

```ts
createRouter({
  routes,
  url: {
    invalidHash: 'recover',
  },
});
```

With `recover`, invalid hash values are treated as missing and descriptor defaults apply when present. With `error`, the path route remains matched and the parse failure is exposed through router error state. With `no-match`, the route candidate is rejected and fallback/not-found matching continues.

## Unknown search params

Route `search` descriptors define the route-owned search state. Unknown search params are query-string keys that are present in the URL but not declared by the matched route. URLKit controls them with `unknownSearch`.

```ts
createRouter({
  routes,
  url: {
    unknownSearch: 'strip',
  },
});
```

Supported modes are:

| Mode         | Behavior                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `'strip'`    | Default. Keep the route matched and omit unknown keys from router state.                                                |
| `'preserve'` | Keep the route matched and expose unknown keys separately as `unknownSearch`. Declared `search` remains strongly typed. |
| `'error'`    | Keep the path route matched and surface the unknown-key failure through router error state.                             |

The default is `'strip'`, inherited from URLKit.

For this route:

```ts
{
  id: 'overview',
  path: '/overview',
  search: {
    page: { value: 'number', default: 1, optional: true },
  },
  url: {
    unknownSearch: 'preserve',
  },
}
```

This URL:

```txt
/overview?page=0&utm_source=website
```

produces declared search and preserved unknown search as separate values:

```ts
match.search;
// { page: 0 }

match.unknownSearch;
// { utm_source: 'website' }
```

`unknownSearch` is different from `invalidSearch`: `invalidSearch` handles malformed values for declared keys, while `unknownSearch` handles undeclared keys.

## Read preserved unknown search params

`useSearchParams()` returns only declared route search. When `unknownSearch: 'preserve'` is configured, use `useUnknownSearchParams()` to read URLKit-preserved unknown keys from the active match.

```tsx
import { useSearchParams, useUnknownSearchParams } from '@cookbook/router-react';

export function OverviewPage() {
  const search = useSearchParams('overview');
  const unknownSearch = useUnknownSearchParams();

  search.page;
  // number

  unknownSearch.utm_source;
  // string | readonly string[] | undefined

  return null;
}
```

Use declared search fields for application state. Use preserved unknown search params for pass-through values such as tracking, debugging, or integration query params.

## Declare hash values

```tsx
{
  id: 'articles.show',
  path: '/articles/{slug}',
  hash: ['comments', 'share'],
  component: ArticlePage,
}
```

Generated hash contract:

```ts
'articles.show': 'comments' | 'share';
```

Routes without declared hash values generate `never`.

## Generate hash URLs

Hash input may include or omit `#`.

```ts
router.href({
  route: 'articles.show',
  params: { slug: 'typed-routing' },
  hash: 'comments',
});

router.href({
  route: 'articles.show',
  params: { slug: 'typed-routing' },
  hash: '#comments',
});
```

Both produce:

```txt
/articles/typed-routing#comments
```

Pass `null` to avoid a hash.

## Read hash values

```tsx
import { useHashParams } from '@cookbook/router-react';

export function ArticlePage() {
  const hash = useHashParams('articles.show');
  return <p>Section: {hash ?? 'none'}</p>;
}
```

`useHashParams()` and `useHash()` return the parsed hash value without the leading `#`, or `null` when no hash is present.

## Runtime behavior

- URLKit parses path params, search, and hash for matches and resolves.
- URLKit builds hrefs for params, search, and hash.
- Hash values are normalized to include one leading `#` in generated hrefs.
- Invalid hash values fail through URLKit-backed validation.
- Search and hash are independent from route params.

## Static extraction

Route files consumed by `@cookbook/router-cli` must remain statically analyzable. Use static descriptors such as:

```ts
search: {
  page: { value: 'int', default: 1 },
  tags: { value: 'string', type: 'many' },
}
```

Do not use URLKit runtime builders such as `int().default(1)` in CLI-consumed route files unless the CLI explicitly supports them.

## Best practices

- Put shareable UI state in search or hash, not outlet context.
- Use params for required path identity and search for optional filters/sorting.
- Use hash for in-page sections, tabs, or share anchors.
- Prefer static URL descriptors so runtime, generated contracts, and CLI workflows stay aligned.
- Configure `arrayFormat` once at the router level when possible; override at route or URL-building call sites only when a route has a different URL contract.
- Configure `unknownSearch: 'preserve'` only when callers need access to undeclared query keys through `match.unknownSearch` or `useUnknownSearchParams()`.
