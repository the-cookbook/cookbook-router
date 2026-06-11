# Search and hash

Search and hash declarations describe URL state for runtime parsing, href/navigation building, and generated contracts. `@cookbook/router` delegates this URL-state work to `@cookbook/urlkit`.

## Table of contents

- [Declare search fields](#declare-search-fields)
- [Supported static search descriptors](#supported-static-search-descriptors)
- [Search field properties](#search-field-properties)
- [Search descriptor use cases](#search-descriptor-use-cases)
- [Date and date-time formats](#date-and-date-time-formats)
- [Generate search URLs](#generate-search-urls)
- [Read search values](#read-search-values)
- [Array format](#array-format)
- [Build defaults](#build-defaults)
- [Invalid search params](#invalid-search-params)
- [Invalid hash values](#invalid-hash-values)
- [Unknown search params](#unknown-search-params)
- [Read preserved unknown search params](#read-preserved-unknown-search-params)
- [Declare hash values](#declare-hash-values)
- [Hash descriptor properties](#hash-descriptor-properties)
- [Hash descriptor use cases](#hash-descriptor-use-cases)
- [Generate hash URLs](#generate-hash-urls)
- [Read hash values](#read-hash-values)
- [Runtime behavior](#runtime-behavior)
- [Static extraction](#static-extraction)
- [Best practices](#best-practices)

## Declare search fields

Use URLKit-backed Router static descriptors in route definitions.

```tsx
{
  id: 'articles.index',
  path: '/articles',
  search: {
    query: { type: 'string', optional: true },
    page: { type: 'int', default: 1 },
    filters: { type: 'string', many: true, optional: true },
    featured: { type: 'boolean', optional: true },
  },
  view: ArticlesPage,
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

`int` and `number` parse to `number`; `boolean` parses to `boolean`; `date` and `date-time` parse to `Date`; unix timestamps use date descriptors with `format: 'unix-seconds'` or `format: 'unix-ms'`; `many: true` parses repeated values according to the effective `arrayFormat`.

## Supported static search descriptors

Router route definitions use URLKit Static descriptors. They are plain data, not runtime builder calls, so they can be validated, compiled, and consumed by the CLI without executing application code.

Every static search field uses this object pattern:

```ts
search: {
  fieldName: {
    type: 'string' | 'number' | 'int' | 'boolean' | 'date' | 'date-time' | 'enum',
    many?: true,
    optional?: true,
    default?: unknown,
    format?: string,
    values?: readonly string[],
  },
}
```

`type` always means value kind. It never means cardinality. Repeated values use `many: true`.

| Descriptor                                                  | Parsed value                | Build value                 | Notes                                                                                        |
| ----------------------------------------------------------- | --------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `{ type: 'string' }`                                        | `string`                    | `string`                    | Required exact string.                                                                       |
| `{ type: 'string', optional: true }`                        | `string \| undefined`       | `string \| undefined`       | Missing value is valid.                                                                      |
| `{ type: 'string', default: 'all' }`                        | `string`                    | `string \| undefined`       | Missing value normalizes to the default.                                                     |
| `{ type: 'number' }`                                        | `number`                    | `number`                    | Finite decimal number.                                                                       |
| `{ type: 'int' }`                                           | `number`                    | `number`                    | Finite integer.                                                                              |
| `{ type: 'boolean' }`                                       | `boolean`                   | `boolean`                   | Strict serialized values: `true` or `false`.                                                 |
| `{ type: 'date' }`                                          | `Date`                      | `Date`                      | UTC date-only, serialized as `YYYY-MM-DD`.                                                   |
| `{ type: 'date', format: 'date' }`                          | `Date`                      | `Date`                      | Explicit date-only built-in format.                                                          |
| `{ type: 'date', format: 'date-time' }`                     | `Date`                      | `Date`                      | Strict UTC date-time built-in format.                                                        |
| `{ type: 'date', format: 'unix-seconds' }`                  | `Date`                      | `Date`                      | Unix epoch seconds.                                                                          |
| `{ type: 'date', format: 'unix-ms' }`                       | `Date`                      | `Date`                      | Unix epoch milliseconds.                                                                     |
| `{ type: 'date', format: 'dd-MM-yyyy' }`                    | `Date`                      | `Date`                      | Static date format string using URLKit's UTC token subset.                                   |
| `{ type: 'date-time' }`                                     | `Date`                      | `Date`                      | Strict UTC instant, serialized as `YYYY-MM-DDTHH:mm:ss.sssZ`.                                |
| `{ type: 'date-time', format: 'date-time' }`                | `Date`                      | `Date`                      | Explicit strict UTC date-time built-in format.                                               |
| `{ type: 'date-time', format: "dd-MM-yyyy'T'HH:mm:ss'Z'" }` | `Date`                      | `Date`                      | Static date-time format string using URLKit's UTC token subset.                              |
| `{ type: 'enum', values: ['newest', 'popular'] }`           | `'newest' \| 'popular'`     | `'newest' \| 'popular'`     | `values` must be a non-empty readonly string array.                                          |
| `{ type: T, many: true }`                                   | `readonly T[]`              | `readonly T[]`              | Repeated query params. Missing values are invalid unless the field is optional or defaulted. |
| `{ type: T, many: true, optional: true }`                   | `readonly T[] \| undefined` | `readonly T[] \| undefined` | Optional repeated query params.                                                              |
| `{ type: T, many: true, default: [...] }`                   | `readonly T[]`              | `readonly T[] \| undefined` | Missing values normalize to the default array.                                               |

## Search field properties

| Property   | Applies to          | Required | Description                                                                                                             |
| ---------- | ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `type`     | All search fields   | Yes      | The parsed value kind: `string`, `number`, `int`, `boolean`, `date`, `date-time`, or `enum`.                            |
| `many`     | All search fields   | No       | Use literal `true` for repeated query params. Omit it for single-value fields. `many: false` is invalid.                |
| `optional` | All search fields   | No       | Use literal `true` when a missing field is valid. Omit it for required/defaulted fields. `optional: false` is invalid.  |
| `default`  | All search fields   | No       | Value used when the field is missing during parse/normalize. Cannot be combined with `optional: true`.                  |
| `values`   | `enum` only         | Yes      | Non-empty readonly string array. Defaults must be included in `values`.                                                 |
| `format`   | `date`, `date-time` | No       | Built-in format or static format string. Runtime `{ parse, serialize }` codec objects are invalid in route definitions. |

### Required, optional, and defaulted fields

```ts
search: {
  // Required. Missing ?q throws missing-search.
  q: { type: 'string' },

  // Optional. Missing ?category is valid and reads as undefined.
  category: { type: 'string', optional: true },

  // Defaulted. Missing ?page reads as 1.
  page: { type: 'int', default: 1 },
}
```

Do not combine `optional: true` with `default`:

```ts
// Invalid
search: {
  page: { type: 'int', optional: true, default: 1 },
}
```

A defaulted field is present after URLKit parses or normalizes the URL state. `defaults: 'omit'` only controls whether values equal to defaults are serialized while building URLs.

### Defaults

Defaults are validated when URLKit compiles the route descriptor.

| Field                | Valid default examples                          | Invalid default examples                    |
| -------------------- | ----------------------------------------------- | ------------------------------------------- |
| `string`             | `'all'`                                         | `1`                                         |
| `number`             | `1.5`                                           | `Number.NaN`, `Infinity`, `'1.5'`           |
| `int`                | `1`                                             | `1.5`, `'1'`                                |
| `boolean`            | `true`, `false`                                 | `'true'`, `1`                               |
| `enum`               | value from `values`                             | value outside `values`                      |
| `date` / `date-time` | serialized value matching the descriptor format | `Date` instance, malformed serialized value |
| `many` field         | array of valid values                           | scalar value, array with invalid members    |

Static date and date-time defaults are serialized values, not `Date` instances, because Static descriptors must remain plain data.

## Search descriptor use cases

### Free-text query

```ts
search: {
  q: { type: 'string', optional: true },
}
```

### Pagination

```ts
search: {
  page: { type: 'int', default: 1 },
  pageSize: { type: 'int', default: 20 },
}
```

### Sorting with enum values

```ts
search: {
  sort: {
    type: 'enum',
    values: ['newest', 'popular', 'price-low', 'price-high'],
    default: 'newest',
  },
}
```

### Boolean filters

```ts
search: {
  featured: { type: 'boolean', optional: true },
}
```

Serialized boolean values must be exactly `true` or `false`. Values such as `1`, `0`, `yes`, and `no` are invalid.

### Repeated filters

```ts
search: {
  tags: { type: 'string', many: true, optional: true },
}
```

With `arrayFormat: 'repeat'`, tags build as `?tags=router&tags=typescript`. With `arrayFormat: 'comma'`, they build as `?tags=router%2Ctypescript`.

### Date range filters

```ts
search: {
  from: { type: 'date', format: 'dd-MM-yyyy', optional: true },
  to: { type: 'date', format: 'dd-MM-yyyy', optional: true },
}
```

### Date-time schedule filters

```ts
search: {
  startsAt: {
    type: 'date-time',
    format: "dd-MM-yyyy'T'HH:mm:ss'Z'",
    optional: true,
  },
}
```

## Date and date-time formats

Use URLKit static date descriptors when a route search field should parse into a `Date`.

```tsx
{
  id: 'products.index',
  path: '/products',
  search: {
    publishedOn: {
      type: 'date',
      format: 'dd-MM-yyyy',
      optional: true,
    },
    startsAt: {
      type: 'date-time',
      format: "dd-MM-yyyy'T'HH:mm:ss'Z'",
      optional: true,
    },
    createdAt: {
      type: 'date',
      format: 'unix-seconds',
      optional: true,
    },
  },
}
```

This keeps the route definition statically analyzable while still allowing URLKit to parse and serialize supported custom date formats.

```txt
/products?publishedOn=06-06-2026&startsAt=06-06-2026T14%3A30%3A05Z&createdAt=1780756205
```

```tsx
const search = useSearchParams('products.index');

search.publishedOn;
// Date | undefined

search.startsAt;
// Date | undefined

search.createdAt;
// Date | undefined
```

Date and date-time values are UTC-based:

| Descriptor                                 | Default serialized form     | UTC behavior                                                                  |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------- |
| `{ type: 'date' }`                         | `YYYY-MM-DD`                | Calendar date is interpreted with UTC year/month/day.                         |
| `{ type: 'date-time' }`                    | `YYYY-MM-DDTHH:mm:ss.sssZ`  | Strict UTC instant. Offset or ambiguous local strings are rejected by URLKit. |
| `{ type: 'date', format: 'unix-seconds' }` | finite integer seconds      | Parses to a `Date` using Unix epoch seconds.                                  |
| `{ type: 'date', format: 'unix-ms' }`      | finite integer milliseconds | Parses to a `Date` using Unix epoch milliseconds.                             |
| Static format string                       | token-defined string        | Parses/serializes using UTC fields.                                           |

Use `toISOString()` or UTC getters such as `getUTCFullYear()` when asserting parsed values. Local display methods such as `toString()` or `getHours()` can show timezone-adjusted values even though URLKit parsed the URL as UTC.

Router static format strings use URLKit's strict token subset:

| Token  | Meaning                      |
| ------ | ---------------------------- |
| `yyyy` | Four-digit UTC year.         |
| `MM`   | Two-digit UTC month.         |
| `dd`   | Two-digit UTC day.           |
| `HH`   | Two-digit UTC hour.          |
| `mm`   | Two-digit UTC minute.        |
| `ss`   | Two-digit UTC second.        |
| `SSS`  | Three-digit UTC millisecond. |

Rules:

- `date` format strings require `yyyy`, `MM`, and `dd` and do not allow time tokens.
- `date-time` format strings require `yyyy`, `MM`, `dd`, `HH`, `mm`, and `ss`; `SSS` is optional.
- Literal letters must be single-quoted, for example `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`.
- Unsupported or ambiguous tokens such as `YY`, `YYYY`, `M`, `D`, `DD`, `h`, `a`, timezone names, and locale month names are rejected.
- If a date-time format omits `SSS`, URLKit rejects serialization of a `Date` with non-zero milliseconds to avoid silent precision loss.

```ts
search: {
  from: {
    type: 'date',
    format: 'dd-MM-yyyy',
    optional: true,
  },
  at: {
    type: 'date-time',
    format: "dd-MM-yyyy'T'HH:mm:ss'Z'",
    optional: true,
  },
}
```

Do not use URLKit runtime builders or custom parse/serialize codec functions inside route definitions:

```ts
// Bad for router static descriptors
search: {
  from: date({ format: 'dd-MM-yyyy' }),
}
```

```ts
// Bad for router static descriptors
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

URLKit validates static date/date-time descriptors at compile time and runtime. Router forwards the static descriptor to URLKit instead of reimplementing date parsing.

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

`useSearchParams()` read the declared URLKit-parsed search state from the current router match. They do not accept `url` options and do not re-parse the URL with different matching policies. Router middleware, lifecycle hooks, `router.match()`, and `router.resolve()` receive the same declared parsed values.

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
    tags: { type: 'string', many: true, optional: true },
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

## Build defaults

URLKit controls whether defaulted search and hash values are serialized while building URLs.

| Option                | Behavior                                             |
| --------------------- | ---------------------------------------------------- |
| omitted / `'include'` | Serialize values equal to descriptor defaults.       |
| `'omit'`              | Omit values equal to normalized descriptor defaults. |

Configure `defaults` globally, per route, or on URL-building call sites.

```ts
const router = createRouter({
  routes,
  url: { defaults: 'omit' },
});
```

```tsx
<Link to="articles.index" search={{ page: 1 }} url={{ defaults: 'omit' }}>
  Articles
</Link>
```

For this descriptor:

```ts
search: {
  page: { type: 'int', default: 1 },
}
```

`defaults: 'omit'` builds `/articles`, while `defaults: 'include'` builds `/articles?page=1`.

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

| Mode         | Behavior                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `'recover'`  | Keep the route matched when URLKit can omit invalid optional/defaulted values. Required invalid values still propagate as errors. |
| `'no-match'` | Reject that route candidate and continue normal fallback/not-found matching.                                                      |
| `'error'`    | Keep the path route matched and surface the parse failure through router error state.                                             |

The default is `'recover'`. URLKit omits invalid optional/defaulted values, but required invalid fields still fail so broken URLs are visible during debugging.

For example:

```ts
search: {
  page: { type: 'number', default: 1 },
  pageSize: { type: 'number', optional: true },
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

With `recover`, URLKit omits invalid optional/defaulted hash values and applies descriptor defaults when present. With `error`, the path route remains matched and the parse failure is exposed through router error state. With `no-match`, the route candidate is rejected and fallback/not-found matching continues.

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
    page: { type: 'number', default: 1 },
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

Static hash descriptors use object form only. Hash values are parsed and generated without the leading `#`; Router adds `#` when building hrefs.

```tsx
{
  id: 'articles.show',
  path: '/articles/{slug}',
  hash: { type: 'enum', values: ['comments', 'share'], optional: true },
  view: ArticlePage,
}
```

Supported forms:

| Descriptor                                                                | Parsed value                         | Build value                             | Notes                                         |
| ------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- | --------------------------------------------- |
| `{ type: 'string' }`                                                      | `string`                             | `string`                                | Required string hash without the leading `#`. |
| `{ type: 'string', optional: true }`                                      | `string \| undefined`                | `string \| undefined`                   | Missing hash is valid.                        |
| `{ type: 'string', default: 'overview' }`                                 | `string`                             | `string \| undefined`                   | Missing hash normalizes to the default.       |
| `{ type: 'enum', values: ['comments', 'share'] }`                         | `'comments' \| 'share'`              | `'comments' \| 'share'`                 | Hash must be one of the declared values.      |
| `{ type: 'enum', values: ['comments', 'share'], optional: true }`         | `'comments' \| 'share' \| undefined` | `'comments' \| 'share' \| undefined`    | Missing hash is valid.                        |
| `{ type: 'enum', values: ['overview', 'comments'], default: 'overview' }` | `'overview' \| 'comments'`           | `'overview' \| 'comments' \| undefined` | Default must be in `values`.                  |

Routes without declared hash values generate `never`.

## Hash descriptor properties

| Property   | Applies to           | Required | Description                                                                                                                |
| ---------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `type`     | All hash descriptors | Yes      | Hash value kind. Supported values are `string` and `enum`.                                                                 |
| `optional` | All hash descriptors | No       | Use literal `true` when a missing hash is valid. Omit it for required/defaulted hash values. `optional: false` is invalid. |
| `default`  | All hash descriptors | No       | Value used when the hash is missing during parse/normalize. Cannot be combined with `optional: true`.                      |
| `values`   | `enum` only          | Yes      | Non-empty readonly string array. Defaults must be included in `values`.                                                    |

Hash descriptor values must be bare values such as `'comments'`, not `'#comments'`.

```ts
// Correct
hash: { type: 'enum', values: ['comments', 'share'], optional: true }

// Invalid: descriptor values must not include #
hash: { type: 'enum', values: ['#comments', '#share'], optional: true }
```

## Hash descriptor use cases

### Optional section hash

```ts
hash: { type: 'string', optional: true }
```

Generated contract:

```ts
'articles.show': string | undefined;
```

### Required section hash

```ts
hash: {
  type: 'string';
}
```

A missing hash is invalid for the route candidate unless `invalidHash: 'recover'` can omit or default the value.

### Enum tabs or anchors

```ts
hash: {
  type: 'enum',
  values: ['overview', 'comments', 'share'],
  optional: true,
}
```

Generated contract:

```ts
'articles.show': 'overview' | 'comments' | 'share' | undefined;
```

### Default hash

```ts
hash: {
  type: 'enum',
  values: ['overview', 'comments'],
  default: 'overview',
}
```

Missing hash normalizes to `'overview'`. When building URLs, `defaults: 'omit'` omits `#overview`; `defaults: 'include'` serializes it.

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
  page: { type: 'int', default: 1 },
  tags: { type: 'string', many: true },
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
