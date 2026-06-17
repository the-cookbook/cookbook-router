# Path routes and constraints

Route `path` values describe the URL pathname matched by a route. Cookbook Router delegates path-pattern syntax, constraint validation, matching, parsed URL state, and URL building to [`@cookbook/urlkit`](https://github.com/the-cookbook/urlkit).

Use this page when defining route paths, choosing built-in constraints, or adding a custom path constraint.

## Table of contents

- [Path route basics](#path-route-basics)
- [Path composition](#path-composition)
- [Path params](#path-params)
- [Optional params](#optional-params)
- [Wildcard params](#wildcard-params)
- [Built-in constraints](#built-in-constraints)
- [`decimal`](#decimal)
- [`int`](#int)
- [`uuid`](#uuid)
- [`min`](#min)
- [`max`](#max)
- [`range`](#range)
- [`minlength`](#minlength)
- [`maxlength`](#maxlength)
- [`list`](#list)
- [`regex`](#regex)
- [Multiple constraints](#multiple-constraints)
- [Parsed param types](#parsed-param-types)
- [Custom constraints](#custom-constraints)
- [`createPathConstraint()`](#createpathconstraint)
- [Register custom constraints](#register-custom-constraints)
- [Custom constraints and generated contracts](#custom-constraints-and-generated-contracts)
- [Path options](#path-options)
- [Matching and href generation](#matching-and-href-generation)
- [Common mistakes](#common-mistakes)

## Path route basics

A route path is a URLKit path pattern:

```tsx
export const routes = defineRoutes([
  { id: 'home', path: '/', view: HomePage },
  { id: 'users.show', path: '/users/{id:int}', view: UserPage },
] as const);
```

Static segments match exactly. Parameter segments are wrapped in braces:

```txt
/users/{id}
/users/{id:int}
/files/{*path}
/search/{term?}
```

Rules:

- `path` describes only the pathname. Search and hash state belong in `search` and `hash` route descriptors.
- Route IDs are the public navigation API. Use route IDs with `router.href()`, `router.navigate`, `<Link>`, and `<NavLink>`.
- Index routes use `index: true` and **must** not define `path`.
- Pathless routes are valid only as layout/group routes with children.

## Path composition

Child route paths are composed with their parent path.

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

The resolved path is:

```txt
/users/{id:int}
```

A child path may start with `/`, but it is still composed relative to the parent route:

```tsx
{
  id: 'settings',
  path: '/settings',
  children: [
    {
      id: 'settings.profile',
      path: '/profile',
      view: ProfilePage,
    },
  ],
}
```

`settings.profile` matches:

```txt
/settings/profile
```

not:

```txt
/profile
```

## Path params

Unconstrained params capture one path segment and are parsed as `strings`.

```tsx
{
  id: 'articles.show',
  path: '/articles/{slug}',
  view: ArticlePage,
}
```

```tsx
<Link to="articles.show" params={{ slug: 'typed-routing' }} />
```

The generated and runtime param type is:

```ts
{
  slug: string;
}
```

Do not write `{slug:string}`. `string` is not a built-in URLKit path constraint but the **default type**. Use `{slug}` for an unconstrained string segment, or use `regex(...)` / a custom constraint when the segment needs validation.

## Optional params

Add `?` after the param name or constraint(s) to make one segment optional:

```txt
/search/{term?}
/products/by-price/{term:min(1):max(999)?}
```

Valid matches include:

```txt
/search
/search/router
/products/by-price
/products/by-price/9.99
```

Optional params are useful for small path variations. Prefer search params for optional filters, sorting, pagination, and shareable UI state.

## Wildcard params

A wildcard captures the rest of the path:

```txt
/files/{*path}
```

It matches:

```txt
/files/images/logo.svg
```

and captures:

```ts
{
  path: ['images', 'logo.svg'];
}
```

Router state exposes wildcard params as `readonly string[]` path segments. When building hrefs, wildcard params can be provided as a slash-delimited string or an array of primitive path segments:

```ts
router.href('files.show', {
  params: { path: ['images', 'logo.svg'] },
});
```

Optional wildcards use `?`:

```txt
/files/{*path?}
```

## Built-in constraints

URLKit provides these built-in constraints, and Router forwards them through URLKit for validation, matching, href generation, SSR, and generated contracts:

| Constraint  | Syntax                             | Matches                                              | Generated/runtime param type |
| ----------- | ---------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `decimal`   | `{price:decimal}`                  | Decimal numeric values such as `1`, `1.5`, `200.99`. | `number`                     |
| `int`       | `{id:int}`                         | Unsigned integer values such as `1`, `42`, `9000`.   | `number`                     |
| `uuid`      | `{id:uuid}`                        | Canonical hyphenated UUID values.                    | `string`                     |
| `min`       | `{price:min(1)}`                   | Numeric values greater than or equal to the minimum. | `number`                     |
| `max`       | `{price:max(10)}`                  | Numeric values less than or equal to the maximum.    | `number`                     |
| `range`     | `{page:range(1,100)}`              | Numeric values inside an inclusive range.            | `number`                     |
| `minlength` | `{slug:minlength(3)}`              | Values with at least the specified length.           | `string`                     |
| `maxlength` | `{slug:maxlength(50)}`             | Values with no more than the specified length.       | `string`                     |
| `list`      | `{view:list(grid\|list\|details)}` | One exact item from a pipe-separated list.           | `string`                     |
| `regex`     | `{slug:regex([a-z0-9-]+)}`         | Values that satisfy the regular expression.          | `string`                     |

There is no built-in `{param:number}` or `{param:string}` constraint. Use `{param:decimal}` for finite decimal path values, `{param:int}` for integers, and `{param}` for unconstrained string segments.

URLKit infers parsed param types from the full constraint chain. If `int`, `decimal`, `range`, `min`, or `max` appears anywhere in the chain, Router state and generated contracts use `number`. Otherwise the param is `string`.

## `decimal`

Use `decimal` for finite decimal path values.

```tsx
{
  id: 'products.by-price',
  path: '/products/by-price/{price:decimal}',
  view: ProductsByPricePage,
}
```

Valid:

```txt
/products/by-price/1
/products/by-price/1.5
/products/by-price/200.99
```

Invalid:

```txt
/products/by-price/abc
/products/by-price/foo-1
```

Runtime and generated params expose `price` as `number`.

## `int`

Use `int` for unsigned integer path values.

```tsx
{
  id: 'users.show',
  path: '/users/{id:int}',
  view: UserPage,
}
```

Valid:

```txt
/users/1
/users/42
/users/9000
```

Invalid:

```txt
/users/abc
/users/1.5
/users/foo-1
```

Runtime and generated params expose `id` as `number`.

## `uuid`

Use `uuid` for canonical hyphenated UUID values.

```tsx
{
  id: 'users.show',
  path: '/users/{id:uuid}',
  view: UserPage,
}
```

Valid:

```txt
/users/550e8400-e29b-41d4-a716-446655440000
/users/00000000-0000-0000-0000-000000000000
```

Invalid:

```txt
/users/abc
/users/550e8400e29b41d4a716446655440000
/users/zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz
```

Runtime and generated params expose `id` as `string`.

## `min`

Use `min(value)` for inclusive numeric minimum validation.

```txt
/products/{price:decimal:min(1)}
/products/{page:min(1)}
```

`min` parses as `number` even when it appears without `decimal` or `int`. Combine it with `decimal` or `int` when the URL matcher should also restrict the segment shape.

## `max`

Use `max(value)` for inclusive numeric maximum validation.

```txt
/products/{price:decimal:max(10)}
/products/{page:max(10)}
```

`max` parses as `number` even when it appears without `decimal` or `int`. Combine it with `decimal` or `int` when the URL matcher should also restrict the segment shape.

## `range`

Use `range(min,max)` for inclusive numeric ranges.

```tsx
{
  id: 'pages.show',
  path: '/pages/{page:range(1,100)}',
  view: PageRoute,
}
```

Valid:

```txt
/pages/1
/pages/50
/pages/100
```

Invalid:

```txt
/pages/0
/pages/101
/pages/abc
```

`min` and `max` are required. Runtime and generated params expose `page` as `number`.

## `minlength`

Use `minlength(length)` for string length validation.

```txt
/articles/{slug:minlength(3)}
```

This validates character length, not numeric value. Runtime and generated params expose `slug` as `string` unless the same constraint chain also includes `min`, `max`, `range`, `int`, or `decimal`.

## `maxlength`

Use `maxlength(length)` for maximum string length validation.

```txt
/articles/{slug:maxlength(50)}
```

This validates character length, not numeric value. Runtime and generated params expose `slug` as `string` unless the same constraint chain also includes a numeric constraint.

## `list`

Use `list(item1|item2|item3)` for small exact string unions in path segments.

```tsx
{
  id: 'search.view',
  path: '/search/{view:list(grid|list|details)}',
  view: SearchViewPage,
}
```

Valid:

```txt
/search/grid
/search/list
/search/details
```

Invalid:

```txt
/search/table
/search/detail
```

Runtime and generated params expose `view` as `string`. If the same value would be better represented as optional UI state, prefer an enum search field instead:

```ts
search: {
  view: { type: 'enum', values: ['grid', 'list', 'details'], default: 'grid' },
}
```

## `regex`

Use `regex(pattern)` when a path segment must match a regular expression.

```tsx
{
  id: 'posts.show',
  path: '/posts/{slug:regex([a-z0-9-]+)}',
  view: PostPage,
}
```

Valid:

```txt
/posts/hello-world
/posts/post-123
```

Invalid:

```txt
/posts/HelloWorld
/posts/hello_world
```

The regex pattern must be a raw regex source, not a JavaScript regex literal. Do not include `/.../` delimiters:

```txt
/posts/{slug:regex(/[a-z0-9-]+/)}  // invalid
/posts/{slug:regex([a-z0-9-]+)}    // valid
```

For cross-segment matching, use a wildcard parameter.

## Multiple constraints

A parameter can use multiple constraints:

```txt
/users/{id:int:range(1,100)}
/products/{price:decimal:min(1):max(10)}
/articles/{slug:minlength(3):maxlength(50)}
/scores/{id:regex(\d):min(1)}
```

Router and URLKit infer parsed param types from the full chain, not from the first constraint. Any numeric constraint in the chain makes the parsed/generated param a `number`.

Use multiple constraints sparingly. If a rule needs custom validation or clearer error messages, create a custom constraint.

## Parsed param types

Router state, React hooks, middleware, lifecycle hooks, and generated contracts use URLKit parsed-param semantics.

| Pattern                    | Runtime/generated type | Notes                                                                                  |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `{slug}`                   | `string`               | Unconstrained segment.                                                                 |
| `{id:int}`                 | `number`               | Parsed integer.                                                                        |
| `{price:decimal}`          | `number`               | Parsed finite decimal.                                                                 |
| `{page:range(1,100)}`      | `number`               | Parsed numeric range value.                                                            |
| `{price:min(1)}`           | `number`               | Parsed numeric minimum value.                                                          |
| `{price:max(10)}`          | `number`               | Parsed numeric maximum value.                                                          |
| `{id:uuid}`                | `string`               | Canonical UUID string.                                                                 |
| `{slug:minlength(3)}`      | `string`               | String length validation.                                                              |
| `{slug:maxlength(50)}`     | `string`               | String length validation.                                                              |
| `{view:list(grid\|list)}`  | `string`               | Validated string.                                                                      |
| `{slug:regex([a-z0-9-]+)}` | `string`               | Validated string.                                                                      |
| `{slug:slug}`              | `string`               | Custom constraints expose `string` unless combined with a numeric built-in constraint. |
| `{*path}`                  | `readonly string[]`    | Captured wildcard path segments in parsed router state.                                |

```tsx
function UserPage() {
  const params = useParams('users.show');

  params.id;
  // number for /users/{id:int}
}
```

## Custom constraints

Create custom constraints when the same path validation rule appears in multiple routes or when a built-in constraint cannot express the rule clearly.

Custom constraints are process-level registrations. Register the same custom constraints in server, client, test, and CLI route-loading environments.

## `createPathConstraint()`

`createPathConstraint()` creates a URLKit path constraint.

```ts
import { createPathConstraint } from '@cookbook/router';

const slug = createPathConstraint({
  parse(paramName, value) {
    if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
      throw new Error(`Parameter "${paramName}" must be a valid slug.`);
    }
  },

  verify(_paramName, params) {
    if (params.trim()) {
      throw new Error('slug does not accept parameters.');
    }
  },

  toRegExp() {
    return '[a-z0-9-]+';
  },
});
```

The methods are:

| Method                            | Purpose                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `parse(paramName, value, params)` | Validate the matched or generated param value. Throw when invalid.                                      |
| `verify(paramName, params)`       | Validate the constraint declaration itself before route matching/generation.                            |
| `toRegExp(params)`                | Return the regular expression source used to match the path segment. Do not include `/.../` delimiters. |

`params` is the optional constraint argument string inside parentheses. For example `{id:tenant(active|idle|trial|suspended|archived)}`:

- `paramName`: `id`
- `params`: `active|idle|trial|suspended|archived`
- `value` is the parameter runtime value. Example: "active" or "foo"

## Register custom constraints

When declaring routes with `defineRoutes()`, register custom constraints with `defineRoutes(..., { pathConstraints })`. `defineRoutes()` validates routes immediately, so custom constraint names must be registered there; otherwise, validation fails with an unknown constraint type error.

```tsx
import { createPathConstraint, createRouter, defineRoutes } from '@cookbook/router';

const slug = createPathConstraint({
  parse(paramName, value) {
    if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
      throw new Error(`Parameter "${paramName}" must be a valid slug.`);
    }
  },
  verify(_paramName, params) {
    if (params.trim()) {
      throw new Error('slug does not accept parameters.');
    }
  },
  toRegExp() {
    return '[a-z0-9-]+';
  },
});

export const routes = defineRoutes(
  [
    {
      id: 'posts.show',
      path: '/posts/{slug:slug}',
      view: PostPage,
    },
  ] as const,
  { pathConstraints: { slug } },
);

export const router = createRouter({ routes });
```

`createRouter({ pathConstraints })` is also supported for **raw** route arrays that were not declared with `defineRoutes()`:

```ts
const router = createRouter({
  routes: [{ id: 'posts.show', path: '/posts/{slug:slug}', view: PostPage }],
  pathConstraints: { slug },
});
```

Advanced integrations can call `registerPathConstraints({ slug })` directly, but app route modules should prefer the explicit `defineRoutes()` or `createRouter()` option so the CLI, tests, SSR, and browser runtimes see the same setup.

## Custom constraints and generated contracts

Custom constraints validate values at runtime, but generated contracts expose custom-constrained params as `string` unless the same constraint chain also includes a numeric built-in constraint.

```tsx
<Link to="posts.show" params={{ slug: 'hello-world' }} />
```

```ts
useParams('posts.show').slug;
// string
```

If you need a numeric path param, prefer built-in numeric constraints:

```txt
{id:int}
{price:decimal}
{page:range(1,100)}
{page:min(1)}
{page:max(100)}
```

## Path options

Router path options are Router-owned pathname policy used during validation, matching, href generation, and canonicalization.

```ts
createRouter({
  routes,
  pathOptions: {
    prune: 'all',
  },
});
```

Supported `prune` values:

| Value           | Behavior                                              |
| --------------- | ----------------------------------------------------- |
| `'all'`         | Remove duplicated delimiters and trailing delimiters. |
| `'duplication'` | Remove duplicated delimiters only.                    |
| `'trailing'`    | Remove trailing delimiters only.                      |
| `false`         | Preserve authored/generated pathnames exactly.        |

The default is:

```ts
{
  prune: 'all';
}
```

## Matching and href generation

Path constraints are enforced during matching and href generation.

```ts
router.match('/users/42')?.params;
// { id: 42 } for /users/{id:int}

router.match('/users/abc');
// null

router.href('users.show', { params: { id: 42 } });
// '/users/42'

router.href('users.show', { params: { id: 'abc' } });
// throws because id does not satisfy int
```

During matching, constrained values that do not satisfy the route pattern become non-matches. During href generation, invalid params throw because the requested route ID has a known path contract and cannot build an invalid URL.

## Common mistakes

### Using `{id:number}`

`number` is not a built-in URLKit path constraint.

Use:

```txt
{id:decimal}
```

for decimal numbers, or:

```txt
{id:int}
```

for integers.

### Using `{slug:string}`

`string` is not a built-in URLKit path constraint.

Use:

```txt
{slug}
```

for an unconstrained string segment.

### Registering custom constraints too late

This fails because `defineRoutes()` validates immediately:

```ts
const routes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const);
registerPathConstraints({ slug });
```

Register through the second `defineRoutes()` argument instead:

```ts
const routes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const, {
  pathConstraints: { slug },
});
```

### Using side-effect-only registration in CLI route files

The CLI extracts static route definitions. Put custom constraints in the second `defineRoutes()` argument so validation and generation can see them.

```ts
export const routes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const, {
  pathConstraints: { slug },
});
```
