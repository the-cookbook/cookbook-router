# Search and hash

Search and hash declarations describe URL state for generated contracts. Runtime URL serialization is handled by router href generation and navigation.

## Table of contents

- [Declare search fields](#declare-search-fields)
- [Generate search URLs](#generate-search-urls)
- [Read search values](#read-search-values)
- [Declare hash values](#declare-hash-values)
- [Generate hash URLs](#generate-hash-urls)
- [Read hash values](#read-hash-values)
- [Runtime behavior](#runtime-behavior)
- [Best practices](#best-practices)

## Declare search fields

```tsx
{
  id: 'articles.index',
  path: '/articles',
  search: {
    query: 'string',
    tag: 'string',
  },
  component: ArticlesPage,
}
```

The current generator uses the keys of `search` and emits optional string fields:

```ts
{
  query?: string;
  tag?: string;
}
```

Descriptor values are not runtime validators. Use them as stable documentation/contract markers.

## Generate search URLs

```ts
router.href({
  route: 'articles.index',
  search: {
    query: 'routing',
    tag: 'typescript',
  },
});
```

Generated URL:

```txt
/articles?query=routing&tag=typescript
```

Undefined and null search values are omitted.

## Read search values

```tsx
import { useSearch } from '@cookbook/router-react';

export function ArticlesPage() {
  const search = useSearch('articles.index');
  const query = search.query ?? '';

  return <p>Search: {query}</p>;
}
```

`useSearch()` parses the current query string. When generated contracts are registered, the returned object is typed for the route ID.

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
import { useHash } from '@cookbook/router-react';

export function ArticlePage() {
  const hash = useHash('articles.show');
  return <p>Section: {hash ?? 'none'}</p>;
}
```

The hook returns the hash without the leading `#`, or `null`.

## Runtime behavior

- Search values are serialized with `URLSearchParams`-style URL encoding.
- Search values are read back as strings.
- Hash values are normalized to include one leading `#` in generated hrefs.
- Hash changes are part of `RouterLocation` and browser history updates.
- Search and hash are independent from route params.

## Best practices

- Put shareable UI state in search or hash, not outlet context.
- Use params for required path identity and search for optional filters/sorting.
- Use hash for in-page sections, tabs, or share anchors.
- Keep search values string-friendly. Serialize complex values yourself before navigation.
- Do not rely on `search` descriptor values for runtime validation.
