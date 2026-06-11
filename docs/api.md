# API reference

This page documents the package-root public APIs exported by `@cookbook/router`, `@cookbook/router-react`, and `@cookbook/router-cli`.

Use this page with the package guides:

- [Getting started](getting-started.md)
- [Routing](routing.md)
- [Path routes and constraints](path-routes.md)
- [Navigation](navigation.md)
- [React integration](react-integration.md)
- [Code generation](codegen.md)
- [SSR](ssr.md)
- [Troubleshooting](troubleshooting.md)
- [Route validation errors](route-validation-errors.md)

## Table of contents

- [`@cookbook/router`](#cookbookrouter)
  - [Route definition APIs](#route-definition-apis)
  - [Path route pattern APIs](#path-route-pattern-apis)
  - [Router creation APIs](#router-creation-apis)
  - [Router instance API](#router-instance-api)
  - [Matching, validation, and normalization APIs](#matching-validation-and-normalization-apis)
  - [History APIs](#history-apis)
  - [Middleware and lifecycle APIs](#middleware-and-lifecycle-apis)
  - [Slots and intercept APIs](#slots-and-intercept-apis)
  - [Serialization APIs](#serialization-apis)
  - [Path constraint APIs](#path-constraint-apis)
  - [Diagnostic error APIs](#diagnostic-error-apis)
  - [Core types](#core-types)
- [`@cookbook/router-react`](#cookbookrouter-react)
  - [React components](#react-components)
  - [React hooks](#react-hooks)
  - [React contexts and render helpers](#react-contexts-and-render-helpers)
  - [React types](#react-types)
- [`@cookbook/router-cli`](#cookbookrouter-cli)
  - [CLI binaries](#cli-binaries)
  - [CLI commands](#cli-commands)
  - [Programmatic command APIs](#programmatic-command-apis)
  - [Generation APIs](#generation-apis)
  - [Route loading and validation APIs](#route-loading-and-validation-apis)
  - [CLI runner APIs](#cli-runner-apis)
  - [CLI types](#cli-types)
- [Contract registration](#contract-registration)
- [Related docs](#related-docs)

## `@cookbook/router`

Install the framework-agnostic runtime:

```sh
pnpm add @cookbook/router
```

Requirements:

- Node.js `>=18`
- ESM package with CommonJS build output available through package exports
- `@cookbook/urlkit` and `@cookbook/pathkit` are installed transitively

### Route definition APIs

#### `defineRoutes(routes, options?)`

Defines a route tree, preserves literal route IDs for type inference, and validates the tree immediately.

```ts
function defineRoutes<const Routes extends readonly RouteDefinition[]>(
  routes: Routes,
  options?: DefineRoutesOptions,
): Routes;

interface DefineRoutesOptions {
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
}
```

Use `pathConstraints` here when route paths reference custom constraints. `defineRoutes()` validates immediately, so constraints must be registered before validation and URLKit route contract compilation.

```tsx
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
  [
    {
      id: 'posts.show',
      path: '/posts/{slug:slug}',
      view: PostPage,
    },
  ] as const,
  { pathConstraints: { slug } },
);
```

#### `RouteDefinition`

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

| Field        | Purpose                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `id`         | Stable public route ID used by links, hrefs, navigation, redirects, generated contracts, and tests.                |
| `path`       | Local path segment or absolute path. Index routes must not define `path`.                                          |
| `index`      | Marks the route as the default child for its parent path.                                                          |
| `view`       | Route view or framework-owned render value. The core package treats it as `unknown`.                               |
| `layout`     | Layout view and named slot definitions.                                                                            |
| `children`   | Primary child routes.                                                                                              |
| `intercepts` | Configured route interception targets for named slots.                                                             |
| `redirect`   | Internal route redirect object or literal href string.                                                             |
| `search`     | URLKit-backed Router static search descriptor used by parsed state and generated contracts.                        |
| `hash`       | URLKit-backed static hash object descriptor for parsed hash state and generated contracts.                         |
| `url`        | Route-level URLKit options such as `arrayFormat`, `defaults`, `invalidSearch`, `invalidHash`, and `unknownSearch`. |
| `meta`       | Arbitrary route metadata.                                                                                          |
| `loading`    | Route-level React Suspense fallback view for loading route subtrees.                                               |
| `error`      | Route-level React error-boundary fallback view for render errors in route subtrees.                                |
| `lifecycle`  | Route lifecycle hooks.                                                                                             |
| `middleware` | Route-specific middleware pipeline.                                                                                |

Related: [Routing](routing.md), [Search and hash](search-and-hash.md), [Middleware](middleware.md), [Lifecycle](lifecycle.md).

#### `renderRouteMatch()`

Renderer-neutral traversal helper for framework adapters and custom renderers.
The core router traverses the active route match, but renderer callbacks decide
how route-owned `view` values become UI.

```ts
import { renderRouteMatch } from '@cookbook/router';

const output = renderRouteMatch(router.state.match, {
  fallback: null,
  renderView(view, context) {
    return renderMyFrameworkView(view, context);
  },
});
```

##### Static search descriptors

`search` uses URLKit-backed Router Static descriptors. Route definitions must stay analyzable by the CLI, so use plain data instead of URLKit runtime builders.

```ts
search: {
  query: { type: 'string', optional: true },
  page: { type: 'int', default: 1 },
  score: { type: 'number', optional: true },
  featured: { type: 'boolean', optional: true },
  tags: { type: 'string', many: true, optional: true },
  sort: {
    type: 'enum',
    values: ['newest', 'popular'],
    default: 'newest',
  },
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
}
```

Every search field is an object with a value `type`. `type` always means the parsed value kind. Repeated values use `many: true`.

```ts
interface RouteSearchSchema {
  readonly [key: string]: RouteSearchField;
}

type RouteSearchField =
  | RouteStringSearchField
  | RouteNumberSearchField
  | RouteIntSearchField
  | RouteBooleanSearchField
  | RouteDateSearchField
  | RouteDateTimeSearchField
  | RouteEnumSearchField;

interface RouteSearchFieldBase {
  readonly many?: true;
  readonly optional?: true;
  readonly default?: unknown;
}

interface RouteStringSearchField extends RouteSearchFieldBase {
  readonly type: 'string';
}

interface RouteNumberSearchField extends RouteSearchFieldBase {
  readonly type: 'number';
}

interface RouteIntSearchField extends RouteSearchFieldBase {
  readonly type: 'int';
}

interface RouteBooleanSearchField extends RouteSearchFieldBase {
  readonly type: 'boolean';
}

interface RouteDateSearchField extends RouteSearchFieldBase {
  readonly type: 'date';
  readonly format?: 'date' | 'date-time' | 'unix-seconds' | 'unix-ms' | string;
}

interface RouteDateTimeSearchField extends RouteSearchFieldBase {
  readonly type: 'date-time';
  readonly format?: 'date-time' | string;
}

interface RouteEnumSearchField extends RouteSearchFieldBase {
  readonly type: 'enum';
  readonly values: readonly string[];
}
```

Supported forms:

| Descriptor                                                  | Parsed value                | Build value                 | Notes                                                                                        |
| ----------------------------------------------------------- | --------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `{ type: 'string' }`                                        | `string`                    | `string`                    | Required exact string.                                                                       |
| `{ type: 'string', optional: true }`                        | `string \| undefined`       | `string \| undefined`       | Missing value is valid.                                                                      |
| `{ type: 'string', default: 'all' }`                        | `string`                    | `string \| undefined`       | Missing value normalizes to the default.                                                     |
| `{ type: 'number' }`                                        | `number`                    | `number`                    | Finite decimal number.                                                                       |
| `{ type: 'int' }`                                           | `number`                    | `number`                    | Finite integer.                                                                              |
| `{ type: 'boolean' }`                                       | `boolean`                   | `boolean`                   | Serialized values must be exactly `true` or `false`.                                         |
| `{ type: 'date' }`                                          | `Date`                      | `Date`                      | UTC date-only, serialized as `YYYY-MM-DD`.                                                   |
| `{ type: 'date', format: 'date-time' }`                     | `Date`                      | `Date`                      | Strict UTC instant using the built-in date-time serializer.                                  |
| `{ type: 'date', format: 'unix-seconds' }`                  | `Date`                      | `Date`                      | Unix epoch seconds.                                                                          |
| `{ type: 'date', format: 'unix-ms' }`                       | `Date`                      | `Date`                      | Unix epoch milliseconds.                                                                     |
| `{ type: 'date', format: 'dd-MM-yyyy' }`                    | `Date`                      | `Date`                      | Static format string using URLKit's UTC token subset.                                        |
| `{ type: 'date-time' }`                                     | `Date`                      | `Date`                      | Strict UTC instant, serialized as `YYYY-MM-DDTHH:mm:ss.sssZ`.                                |
| `{ type: 'date-time', format: "dd-MM-yyyy'T'HH:mm:ss'Z'" }` | `Date`                      | `Date`                      | Static date-time format string using UTC fields.                                             |
| `{ type: 'enum', values: ['newest', 'popular'] }`           | `'newest' \| 'popular'`     | `'newest' \| 'popular'`     | `values` must be a non-empty readonly string array.                                          |
| `{ type: T, many: true }`                                   | `readonly T[]`              | `readonly T[]`              | Repeated query params. Missing values are invalid unless the field is optional or defaulted. |
| `{ type: T, many: true, optional: true }`                   | `readonly T[] \| undefined` | `readonly T[] \| undefined` | Optional repeated query params.                                                              |
| `{ type: T, many: true, default: [...] }`                   | `readonly T[]`              | `readonly T[] \| undefined` | Missing values normalize to the default array.                                               |

Properties:

| Property   | Applies to          | Required | Description                                                                                                                                                |
| ---------- | ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`     | All search fields   | Yes      | Parsed value kind. Supported values are `string`, `number`, `int`, `boolean`, `date`, `date-time`, and `enum`.                                             |
| `many`     | All search fields   | No       | Use literal `true` for repeated query params. Omit it for single-value fields. `false` is invalid.                                                         |
| `optional` | All search fields   | No       | Use literal `true` when a missing value is valid. Omit it for required/defaulted fields. `false` is invalid.                                               |
| `default`  | All search fields   | No       | Normalized value used when the field is missing. Cannot be combined with `optional: true`. Defaults are validated by URLKit during descriptor compilation. |
| `values`   | `enum`              | Yes      | Non-empty readonly string array. Defaults must be one of these values.                                                                                     |
| `format`   | `date`, `date-time` | No       | Built-in format or static format string. Runtime codec objects are invalid in Router route definitions.                                                    |

Validation rules:

- `type` always means value kind; it is not cardinality.
- `many: true` is the only supported repeated-value marker.
- `optional: true` and `default` are mutually exclusive because a defaulted field is present after parse/normalize.
- Static descriptors reject runtime URLKit builders such as `int().default(1)`.
- Static descriptors reject runtime date codecs such as `{ parse, serialize }`.
- Static date defaults must be serialized values, not `Date` instances.
- Unknown search keys are controlled by `unknownSearch`, not by the descriptor itself.

Date and date-time descriptors support static format strings. URLKit parses and serializes date/date-time fields with UTC semantics: `date` is a UTC calendar date, `date-time` is a strict UTC instant, Unix formats use epoch seconds/milliseconds, and custom static format strings read/write UTC fields. Unsupported, ambiguous, and unquoted format tokens are rejected by URLKit and reported with Router route/search-param context. For example, `DD-MM-yyyy` is invalid; use `dd-MM-yyyy` for a two-digit UTC day. Use `toISOString()` or UTC getters when asserting parsed `Date` values because local display methods can show timezone-adjusted values.

```ts
// Bad for router route definitions: runtime builder, not static data.
search: {
  from: date({ format: 'dd-MM-yyyy' }),
}
```

```ts
// Bad for router route definitions: runtime codec object.
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

Router forwards supported static descriptors to URLKit. URLKit owns strict format-string parsing, default validation, and descriptor validation.

##### Static hash descriptors

`hash` uses URLKit-backed Static hash object descriptors. Do not use array shorthand.

```ts
hash: {
  type: 'enum',
  values: ['comments', 'share'],
  optional: true,
}
```

```ts
interface RouteHashDescriptorBase {
  readonly optional?: true;
}

interface RouteStringHashDescriptor extends RouteHashDescriptorBase {
  readonly type: 'string';
  readonly default?: string;
}

interface RouteEnumHashDescriptor extends RouteHashDescriptorBase {
  readonly type: 'enum';
  readonly values: readonly string[];
  readonly default?: string;
}

type RouteHashSchema = RouteStringHashDescriptor | RouteEnumHashDescriptor;
```

Supported forms:

| Descriptor                                                                | Parsed value                         | Build value                             | Notes                                        |
| ------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------- | -------------------------------------------- |
| `{ type: 'string' }`                                                      | `string`                             | `string`                                | Required hash value without the leading `#`. |
| `{ type: 'string', optional: true }`                                      | `string \| undefined`                | `string \| undefined`                   | Missing hash is valid.                       |
| `{ type: 'string', default: 'overview' }`                                 | `string`                             | `string \| undefined`                   | Missing hash normalizes to the default.      |
| `{ type: 'enum', values: ['comments', 'share'] }`                         | `'comments' \| 'share'`              | `'comments' \| 'share'`                 | Hash must be one of the declared values.     |
| `{ type: 'enum', values: ['comments', 'share'], optional: true }`         | `'comments' \| 'share' \| undefined` | `'comments' \| 'share' \| undefined`    | Missing hash is valid.                       |
| `{ type: 'enum', values: ['overview', 'comments'], default: 'overview' }` | `'overview' \| 'comments'`           | `'overview' \| 'comments' \| undefined` | Default must be in `values`.                 |

Properties:

| Property   | Applies to           | Required | Description                                                                                                    |
| ---------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `type`     | All hash descriptors | Yes      | Hash value kind. Supported values are `string` and `enum`.                                                     |
| `optional` | All hash descriptors | No       | Use literal `true` when missing hash is valid. Omit it for required/defaulted hash values. `false` is invalid. |
| `default`  | All hash descriptors | No       | Normalized value used when the hash is missing. Cannot be combined with `optional: true`.                      |
| `values`   | `enum`               | Yes      | Non-empty readonly string array. Defaults must be one of these values.                                         |

Descriptor values must be bare values such as `'comments'`, not `'#comments'`. Router normalizes generated URLs to include one leading `#`. `defaults: 'omit'` also applies to defaulted hashes when building URLs.

### Path route pattern APIs

Router path patterns use `@cookbook/pathkit` syntax under URLKit route-runtime contracts. The full guide is [Path routes and constraints](path-routes.md).

#### Path syntax

| Syntax                    | Purpose                                         | Example                        |
| ------------------------- | ----------------------------------------------- | ------------------------------ |
| Static segment            | Match an exact pathname segment.                | `/settings/profile`            |
| `{name}`                  | Capture one unconstrained string segment.       | `/articles/{slug}`             |
| `{name?}`                 | Capture one optional segment.                   | `/search/{term?}`              |
| `{*name}`                 | Capture the rest of the path.                   | `/files/{*path}`               |
| `{*name?}`                | Capture an optional rest-of-path wildcard.      | `/files/{*path?}`              |
| `{name:constraint}`       | Capture and validate a segment.                 | `/users/{id:int}`              |
| `{name:constraint(args)}` | Capture and validate with constraint arguments. | `/pages/{page:range(1,100)}`   |
| `{name:a:b(args)}`        | Apply multiple constraints.                     | `/users/{id:int:range(1,100)}` |

There is no built-in `{param:number}` or `{param:string}` constraint. Use `{param:decimal}` for decimal numbers, `{param:int}` for integers, and `{param}` for unconstrained strings.

#### Built-in path constraints

PathKit provides these built-in constraints, which Router forwards to URLKit for route validation, matching, href generation, static router workflows, and generated contracts.

| Constraint  | Syntax                             | Valid examples                         | Invalid examples            | Runtime/generated type |
| ----------- | ---------------------------------- | -------------------------------------- | --------------------------- | ---------------------- |
| `decimal`   | `{price:decimal}`                  | `1`, `1.5`, `42`, `200.99`             | `abc`, `foo-1`              | `number`               |
| `int`       | `{id:int}`                         | `1`, `42`, `9000`                      | `abc`, `1.5`, `foo-1`       | `number`               |
| `uuid`      | `{id:uuid}`                        | `550e8400-e29b-41d4-a716-446655440000` | `abc`, missing hyphens      | `string`               |
| `min`       | `{price:min(1)}`                   | `1`, `9.99`, `10`                      | `0`, `abc`                  | `number`               |
| `max`       | `{price:max(10)}`                  | `1`, `9.99`, `10`                      | `10.01`, `abc`              | `number`               |
| `range`     | `{page:range(1,100)}`              | `1`, `50`, `100`                       | `0`, `101`, `abc`           | `number`               |
| `minlength` | `{slug:minlength(3)}`              | `foo`, `product-123`                   | `a`, `ab`                   | `string`               |
| `maxlength` | `{slug:maxlength(50)}`             | `foo`, `product-123`                   | value longer than max       | `string`               |
| `list`      | `{view:list(grid\|list\|details)}` | `grid`, `list`, `details`              | `table`, `detail`           | `string`               |
| `regex`     | `{slug:regex([a-z0-9-]+)}`         | `hello-world`, `post-123`              | `HelloWorld`, `hello_world` | `string`               |

URLKit infers parsed param types from the full constraint chain. If `int`, `decimal`, `range`, `min`, or `max` appears anywhere in the chain, router state, React hooks, middleware, lifecycle hooks, and generated contracts use `number`. `uuid`, `minlength`, `maxlength`, `list`, `regex`, unconstrained params, wildcards, and custom constraints expose `string` unless the same chain also includes a numeric constraint.

```tsx
const routes = defineRoutes([
  { id: 'users.show', path: '/users/{id:int}', view: UserPage },
  { id: 'prices.show', path: '/prices/{price:decimal}', view: PricePage },
  { id: 'pages.show', path: '/pages/{page:range(1,100)}', view: PageRoute },
  { id: 'products.min', path: '/products/{price:decimal:min(1)}', view: ProductsPage },
  { id: 'users.uuid', path: '/uuid-users/{id:uuid}', view: UserPage },
  { id: 'search.view', path: '/search/{view:list(grid|list|details)}', view: SearchPage },
  { id: 'posts.show', path: '/posts/{slug:regex([a-z0-9-]+)}', view: PostPage },
] as const);
```

#### Path options

```ts
interface RouterPathOptions {
  readonly prune?: 'all' | 'duplication' | 'trailing' | false;
}
```

| Value           | Behavior                                                                   |
| --------------- | -------------------------------------------------------------------------- |
| `'all'`         | Remove duplicated delimiters and trailing delimiters. This is the default. |
| `'duplication'` | Remove duplicated delimiters only.                                         |
| `'trailing'`    | Remove trailing delimiters only.                                           |
| `false`         | Preserve authored/generated pathnames exactly.                             |

`pathOptions` can be passed to `defineRoutes()`, `createRouter()`, `createMemoryRouter()`, and `createStaticRouter()`.

#### Custom path constraints

Use `createConstraint()` for reusable validation rules that are not covered by the built-ins.

```ts
import { createConstraint, defineRoutes } from '@cookbook/router';

const slug = createConstraint({
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
  [{ id: 'posts.show', path: '/posts/{slug:slug}', view: PostPage }] as const,
  { pathConstraints: { slug } },
);
```

`defineRoutes()` validates immediately, so register custom constraints through the second `defineRoutes()` argument before the route path is checked. `createRouter({ pathConstraints })` is supported for raw route arrays that were not already validated. Register the same constraints in server, client, tests, and CLI route-loading environments.

### URLKit bridge APIs

These APIs are exported for advanced integrations, tests, and Router internals. Most application code should prefer `createRouter()`, `router.href()`, `router.match()`, and React hooks.

#### `createRouteUrlContract(route, options?)`

Creates the URLKit route-runtime contract for one Router route descriptor. Router forwards the final Static descriptor shape directly to URLKit; it does not translate invalid search/hash forms.

```ts
function createRouteUrlContract(
  route: RouterRouteUrlDescriptor,
  options?: CreateRouterRouteUrlContractOptions,
): RouterRouteUrlContract;

interface RouterRouteUrlDescriptor {
  readonly path?: string;
  readonly search?: RouteSearchSchema;
  readonly hash?: RouteHashSchema;
  readonly url?: RouterUrlOptions;
}

interface CreateRouterRouteUrlContractOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routeId?: string;
}
```

```ts
const contract = createRouteUrlContract(
  {
    path: '/articles/{id:int}',
    search: {
      page: { type: 'int', default: 1 },
      tag: { type: 'string', many: true, optional: true },
      startsAt: {
        type: 'date-time',
        format: "dd-MM-yyyy'T'HH:mm:ss'Z'",
        optional: true,
      },
    },
    hash: { type: 'enum', values: ['comments', 'share'], optional: true },
  },
  { routeId: 'articles.show' },
);

const state = contract.parse('/articles/42?page=2#comments');
const href = contract.build({ params: { id: 42 }, search: { page: 2 }, hash: 'comments' });
```

`routeId` is diagnostic-only. If URLKit rejects a descriptor, Router preserves the `UrlKitError` code/path and adds route context.

#### `RouterRouteUrlContract`

Router intentionally exposes a narrow URLKit route-contract surface.

```ts
interface RouterRouteUrlContract {
  readonly pattern: string | undefined;
  parse(input: string | URL, options?: RouterRouteSearchParseOptions): unknown;
  match(input: string | URL, options?: RouterRouteSearchParseOptions): boolean;
  build(input: unknown, options?: RouterUrlBuildOptions): string;
  parsePathname: ((pathname: string) => unknown) | never;
  buildPath: ((params: unknown) => string) | never;
  parseSearch(input: string | URLSearchParams, options?: RouterRouteSearchParseOptions): unknown;
  buildSearch(search: unknown, options?: RouterUrlBuildOptions): string;
  parseHash(input: unknown): unknown;
  buildHash(hash?: unknown, options?: RouterUrlBuildOptions): string;
}

interface RouterRouteSearchParseOptions {
  readonly arrayFormat?: 'repeat' | 'comma';
  readonly unknownSearch?: 'strip' | 'preserve' | 'error';
  readonly invalidSearch?: 'error' | 'omit';
}
```

| Method          | Purpose                                                        | Notes                                                                     |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pattern`       | Original path pattern or `undefined` for pathless descriptors. | Mirrors URLKit route-runtime.                                             |
| `parse`         | Parse serialized URL input into URLKit state.                  | Used when Router needs search, hash, params, and unknown search together. |
| `match`         | Return whether serialized URL input satisfies the contract.    | URLKit validation failures return `false`.                                |
| `build`         | Serialize structured state to a canonical URL string.          | Accepts `arrayFormat` and `defaults`.                                     |
| `parsePathname` | Parse path params from a pathname.                             | Path-mode routes only. Router uses parsed params.                         |
| `buildPath`     | Build a pathname from params.                                  | Path-mode routes only.                                                    |
| `parseSearch`   | Parse search input through the route search schema.            | Accepts `arrayFormat`, `unknownSearch`, and `invalidSearch`.              |
| `buildSearch`   | Build a search suffix from typed search state.                 | Accepts `arrayFormat` and `defaults`.                                     |
| `parseHash`     | Parse hash input through the route hash descriptor.            | Returns the bare hash value.                                              |
| `buildHash`     | Build a hash suffix.                                           | Accepts `defaults`; generated suffix includes `#` when non-empty.         |

#### `resolveUrlOptions(input)`

Resolves URL options with Router precedence.

```ts
function resolveUrlOptions(input: ResolveUrlOptionsInput): RouterUrlOptions;

interface ResolveUrlOptionsInput {
  readonly router?: RouterUrlOptions;
  readonly route?: RouterUrlOptions;
  readonly call?: RouterUrlOptions;
}
```

Precedence is call-site, then route-level, then router-level. This helper is useful for tests and integrations that need to inspect the effective URL policy without creating a full router.

#### `registerUrlPathConstraints(constraints?)`

Registers Router custom path constraints with URLKit before descriptor compilation.

```ts
function registerUrlPathConstraints(constraints?: RouterPathConstraints): void;
```

Use this only when building lower-level integrations. Normal applications should pass constraints through `defineRoutes(routes, { pathConstraints })` or `createRouter({ pathConstraints })`.

### Router creation APIs

#### `createRouter(options)`

Creates a browser-capable router. In non-browser environments, it falls back to memory history unless a `history` is supplied.

```ts
function createRouter(options: CreateRouterOptions): Router;

interface CreateRouterOptions {
  readonly routes: readonly RouteDefinition[];
  readonly basename?: string;
  readonly middleware?: readonly Middleware[];
  readonly lifecycle?: GlobalLifecycle;
  readonly hydrationData?: SerializedRouterState;
  readonly history?: RouterHistory;
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly url?: RouterUrlOptions;
  readonly maxRedirectDepth?: number;
  readonly maxRedirectionDepth?: number;
}

interface RouterUrlOptions {
  readonly arrayFormat?: 'repeat' | 'comma';
  readonly defaults?: 'include' | 'omit';
  readonly invalidSearch?: 'recover' | 'no-match' | 'error';
  readonly invalidHash?: 'recover' | 'no-match' | 'error';
  readonly unknownSearch?: 'strip' | 'preserve' | 'error';
}

interface RouterUrlBuildOptions {
  readonly arrayFormat?: 'repeat' | 'comma';
  readonly defaults?: 'include' | 'omit';
}
```

Router URL options are resolved in this order: call-site options, then route-level `url`, then router-level `url`, then URLKit defaults.

| Option          | Scope            | Purpose                                                                                      |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `arrayFormat`   | parse/build      | Controls repeated search params: `repeat` or `comma`.                                        |
| `defaults`      | build            | Controls whether URLKit serializes values equal to descriptor defaults: `include` or `omit`. |
| `invalidSearch` | route resolution | Controls malformed declared search values: `recover`, `no-match`, or `error`.                |
| `invalidHash`   | route resolution | Controls malformed declared hash values: `recover`, `no-match`, or `error`.                  |
| `unknownSearch` | route resolution | Controls undeclared search keys: `strip`, `preserve`, or `error`.                            |

`unknownSearch` defaults to `'strip'`, inherited from URLKit. `invalidSearch` and `invalidHash` default to Router's recover policy, which maps to URLKit's omit behavior for invalid optional/defaulted fields. Required invalid fields still propagate as errors.

```ts
import { createRouter } from '@cookbook/router';
import { routes } from './routes';

const router = createRouter({
  routes,
  basename: '/app',
  maxRedirectDepth: 10,
  pathOptions: { prune: 'all' },
});

await router.start();
```

| Option                |                   Default | Purpose                                                                                                                            |
| --------------------- | ------------------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| `routes`              |                  Required | Route tree.                                                                                                                        |
| `basename`            |               `undefined` | URL prefix stripped during matching and added during href generation.                                                              |
| `middleware`          |                      `[]` | Global middleware.                                                                                                                 |
| `lifecycle`           |                      `{}` | Global lifecycle hooks.                                                                                                            |
| `hydrationData`       |               `undefined` | State from SSR serialization.                                                                                                      |
| `history`             | Browser or memory history | Custom history implementation.                                                                                                     |
| `pathOptions`         |        `{ prune: 'all' }` | Pathkit behavior.                                                                                                                  |
| `pathConstraints`     |               `undefined` | Custom constraints for unvalidated route arrays. Prefer `defineRoutes(..., { pathConstraints })`.                                  |
| `url`                 |           URLKit defaults | Router-level URL options. `unknownSearch` defaults to `'strip'`; `invalidSearch`/`invalidHash` default to Router recover behavior. |
| `maxRedirectDepth`    |    Implementation default | Redirect loop guard.                                                                                                               |
| `maxRedirectionDepth` |                     Alias | Backward-compatible alias for `maxRedirectDepth`.                                                                                  |

#### `createMemoryRouter(options)`

Creates a router backed by memory history.

```ts
function createMemoryRouter(options: CreateMemoryRouterOptions): Router;

interface CreateMemoryRouterOptions extends Omit<CreateRouterOptions, 'history'> {
  readonly initialEntries?: readonly string[];
  readonly initialIndex?: number;
}
```

```ts
import { createMemoryRouter } from '@cookbook/router';

const router = createMemoryRouter({
  routes,
  initialEntries: ['/users/42?tab=settings'],
});

await router.start();
```

Use this in tests, Storybook-like environments, and non-browser examples.

#### `createStaticRouter(options)`

Creates a router backed by static history for SSR.

```ts
type StaticRouterUrl = string | URL | Request;

interface CreateStaticRouterOptions extends Omit<CreateRouterOptions, 'history'> {
  readonly url?: StaticRouterUrl;
  readonly request?: Request;
}

function createStaticRouter(options: CreateStaticRouterOptions): Router;
```

```ts
import { createStaticRouter } from '@cookbook/router';

const router = createStaticRouter({
  routes,
  url: '/articles/typed-routing?preview=true#summary',
});

await router.start();
```

Use the same route definitions and custom constraints on the server and client.

### Router instance API

```ts
interface Router {
  readonly routes: readonly NormalizedRoute[];
  readonly rankedRoutes: readonly RankedRoute[];
  readonly state: RouterState;

  href<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): string;
  href<Route extends string>(routeId: Route, options?: HrefOptions<Route>): string;
  href<Route extends RouteId>(options: NavigateOptions<Route>): string;
  href<Route extends string>(options: NavigateOptions<Route>): string;

  resolve<Route extends RouteId>(
    routeId: Route,
    options?: HrefOptions<Route>,
  ): RegisteredRouteMatch;
  resolve<Route extends string>(routeId: Route, options?: HrefOptions<Route>): RegisteredRouteMatch;
  resolve<Route extends RouteId>(options: NavigateOptions<Route>): RegisteredRouteMatch;
  resolve<Route extends string>(options: NavigateOptions<Route>): RegisteredRouteMatch;

  match(href: string, options?: MatchOptions): RegisteredRouteMatch | null;

  navigate: {
    to<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): Promise<RouterState>;
    to<Route extends string>(routeId: Route, options?: HrefOptions<Route>): Promise<RouterState>;
    to<Route extends RouteId>(options: NavigateOptions<Route>): Promise<RouterState>;
    to<Route extends string>(options: NavigateOptions<Route>): Promise<RouterState>;
    replace<Route extends RouteId>(
      routeId: Route,
      options?: HrefOptions<Route>,
    ): Promise<RouterState>;
    replace<Route extends string>(
      routeId: Route,
      options?: HrefOptions<Route>,
    ): Promise<RouterState>;
    replace<Route extends RouteId>(options: NavigateOptions<Route>): Promise<RouterState>;
    replace<Route extends string>(options: NavigateOptions<Route>): Promise<RouterState>;
    back: () => void;
    forward: () => void;
    go: (delta: number) => void;
  };

  subscribe(listener: (state: RouterState) => void): () => void;
  block(blocker: RouterBlocker): () => void;
  useMiddleware(middleware: readonly Middleware[]): () => void;
  start(): Promise<RouterState>;
  serialize(): SerializedRouterState;
}
```

Prefer object-form navigation for new code because it is easier to refactor and mirrors generated contract names:

```ts
await router.navigate.to({
  route: 'users.show',
  params: { id: 42 },
  search: { tab: 'settings' },
  hash: 'profile',
});
```

#### Navigation blockers

```ts
interface RouterBlockerContext {
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}

type RouterBlocker = (context: RouterBlockerContext) => boolean | void | Promise<boolean | void>;
```

Register a blocker with `router.block()`. Returning `false` blocks the transition and sets navigation state to `blocked`; returning `true` or `undefined` allows it. The unregister function removes the blocker. React apps usually use `useBlocker()` instead of calling this directly.

#### `HrefOptions` and `NavigateOptions`

```ts
interface HrefOptions<Route extends string> {
  readonly params?: RouteParams<Route>;
  readonly search?: RouteSearch<Route>;
  readonly hash?: RouteHashInput<Route>;
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly url?: RouterUrlBuildOptions;
}

interface NavigateOptions<Route extends string> extends HrefOptions<Route> {
  readonly route: Route;
}

interface MatchOptions {
  readonly url?: RouterUrlOptions;
}
```

`HrefOptions.url` and `NavigateOptions.url` are build-only options. They accept `arrayFormat` and `defaults`. `MatchOptions.url` is a route-resolution override and accepts the full `RouterUrlOptions` policy set.

#### `RouterState`

```ts
interface RouterState {
  readonly location: RouterLocation;
  readonly match: RouteMatch | null;
  readonly navigation: RouterNavigationState;
  readonly error?: unknown;
  readonly previousLocation?: RouterLocation;
}
```

### Matching, validation, and normalization APIs

These lower-level helpers are public for tests, tooling, and advanced integrations. Most app code should use a `Router` instance instead.

| API               | Signature                                                                                                               | Use case                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `validateRoutes`  | `(routes: readonly RouteDefinition[], pathOptions?: RouterPathOptions) => void`                                         | Validate route tree shape and throw on invalid config. See [Route validation errors](route-validation-errors.md). |
| `normalizeRoutes` | `(routes: readonly RouteDefinition[], pathOptions?: RouterPathOptions) => readonly NormalizedRoute[]`                   | Convert route definitions into normalized route records.                                                          |
| `matchRoutes`     | `(routes: readonly NormalizedRoute[], pathname: string, pathOptions?: RouterPathOptions) => RouteMatch<string> \| null` | Match a pathname against normalized routes.                                                                       |

```ts
import { matchRoutes, normalizeRoutes } from '@cookbook/router';

const normalized = normalizeRoutes(routes);
const match = matchRoutes(normalized, '/users/42');
```

### History APIs

#### `createMemoryHistory(options?)`

```ts
interface MemoryHistoryOptions {
  readonly initialEntries?: readonly string[];
  readonly initialIndex?: number;
}

function createMemoryHistory(options?: MemoryHistoryOptions): RouterHistory;
```

#### `createBrowserHistory()`

Creates a browser history implementation backed by `window.history`.

```ts
function createBrowserHistory(): RouterHistory;
```

#### `createStaticHistory(url)`

Creates a static history implementation for SSR.

```ts
function createStaticHistory(url: string | URL | Request): RouterHistory;
```

#### `parseHref(href, options?)`

```ts
function parseHref(
  href: string,
  options?: {
    readonly state?: unknown;
    readonly key?: string;
  },
): RegisteredRouteMatch;
```

#### `RouterHistory`

```ts
interface RouterHistory {
  readonly location: RouterLocation;
  readonly mode?: 'browser' | 'memory' | 'static';
  redirectExternal?: (href: string, mode: 'push' | 'replace') => void;
  push: (href: string, state?: unknown) => void;
  replace: (href: string, state?: unknown) => void;
  back: () => void;
  forward: () => void;
  go: (delta: number) => void;
  listen: (listener: (event: HistoryEvent) => void) => () => void;
}
```

```ts
interface RouterLocation {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly href: string;
  readonly state?: unknown;
  readonly key: string;
}
```

Rules:

- `pathname` excludes search and hash.
- `search` includes the leading `?` when present.
- `hash` includes the leading `#` when present.
- `href` is `pathname + search + hash`.
- Browser history `state` must be structured-cloneable.

### Middleware and lifecycle APIs

Middleware and lifecycle hooks are configured through `createRouter()` and route definitions. The package root does not expose the internal middleware, lifecycle, or transition runner functions as public APIs.

Related: [Middleware](middleware.md), [Lifecycle](lifecycle.md).

### Slots and intercept APIs

Slots and intercepts are resolved by the core router as part of route matching and rendering traversal. Application code should usually consume them through a framework integration, such as `<Slot name="..." />` from `@cookbook/router-react`, or through `renderRouteMatch()` when building a custom renderer.

The package root exposes slot and intercept state types, but not the internal slot/intercept resolver helpers as public APIs.

Related: [Routing slots](routing.md#layout-slots), [Navigation interception](navigation.md#interception), [React slots](react-integration.md#slots).

### Serialization APIs

```ts
function serializeRouterState(router: Pick<Router, 'serialize'>): SerializedRouterState;
function stringifyRouterState(router: Pick<Router, 'serialize'>): string;
function deserializeRouterState(state: SerializedRouterState | string): SerializedRouterState;

interface SerializedRouterState {
  readonly location: RouterLocation;
  readonly navigation: RouterNavigationState;
}
```

```ts
import { deserializeRouterState, stringifyRouterState } from '@cookbook/router';

const hydrationJson = stringifyRouterState(router);
const hydrationData = deserializeRouterState(hydrationJson);
```

Use these for SSR hydration. `stringifyRouterState()` is the safe choice for embedding router state in an HTML script payload.

Related: [SSR](ssr.md).

### Path constraint APIs

`@cookbook/router` re-exports selected `@cookbook/pathkit` helpers for custom route params. Registered constraints are forwarded to URLKit before route validation, matching, href generation, CLI generation, and SSR/static router workflows.

```ts
function createConstraint(definition: {
  readonly parse: (
    paramName: string,
    value: string | number | boolean | undefined,
    params: string,
  ) => void;
  readonly verify: (paramName: string, params: string) => void;
  readonly toRegExp: (params: string) => string;
}): RouterPathConstraint;

function registerPathConstraints(constraints?: RouterPathConstraints): void;
function hasConstraint(name: string): boolean;
function getConstraint(name: string): RouterPathConstraint | undefined;
function unregisterConstraint(name: string): void;

interface RouterPathConstraints {
  readonly [name: string]: RouterPathConstraint;
}
```

| API                         | Purpose                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `createConstraint()`        | Create a custom PathKit-compatible constraint with `parse`, `verify`, and `toRegExp`.                                                |
| `registerPathConstraints()` | Register custom constraints globally and clear Router path caches. Prefer `defineRoutes(..., { pathConstraints })` in route modules. |
| `hasConstraint()`           | Check whether a constraint is registered.                                                                                            |
| `getConstraint()`           | Read a registered constraint for diagnostics or tests.                                                                               |
| `unregisterConstraint()`    | Remove a registered constraint, mainly for isolated tests.                                                                           |

Built-in PathKit constraints available in route paths are `decimal`, `int`, `uuid`, `min`, `max`, `range`, `minlength`, `maxlength`, `list`, and `regex`. See [Path routes and constraints](path-routes.md) for syntax, examples, parsed types, and custom-constraint guidance.

```ts
const slug = createConstraint({
  parse(paramName, value) {
    if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
      throw new Error(`${paramName} must be a slug.`);
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

const routes = defineRoutes([{ id: 'posts.show', path: '/posts/{slug:slug}' }] as const, {
  pathConstraints: { slug },
});
```

### Diagnostic error APIs

The package exports error factory helpers used by runtime diagnostics and tests:

- `createGeneratedHrefMismatchError`
- `createHydrationMismatchError`
- `createInvalidParamError`
- `createMalformedRedirectError`
- `createMissingOutletContextError`
- `createMissingParamError`
- `createMissingPathError`
- `createMissingProviderError`
- `createUnknownRouteError`

Use these only when implementing integrations that need consistent router errors.

### Core types

Important exported types include:

| Type                                                           | Purpose                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RouteId`                                                      | Registered route ID union. Falls back to `string` before contracts are generated.                                                                                                                                                                |
| `RouteParams<Route>`                                           | URLKit-parsed params for a registered route. `{id:int}`, `{price:decimal}`, `{value:range(1,10)}`, `{value:min(1)}`, and `{value:max(10)}` are `number`; `uuid`, `minlength`, `maxlength`, `list`, `regex`, and custom constraints are `string`. |
| `RouteSearch<Route>`                                           | URLKit-parsed search object for a registered route.                                                                                                                                                                                              |
| `RouteHash<Route>`                                             | URLKit-parsed hash value for a registered route.                                                                                                                                                                                                 |
| `RouteHashInput<Route>`                                        | Input accepted for route hash generation.                                                                                                                                                                                                        |
| `RouteMeta<Route>` / `RegisteredRouteMeta<Route>`              | Metadata for a registered route.                                                                                                                                                                                                                 |
| `RouteOutletContext<Route>`                                    | Outlet context type for a registered route.                                                                                                                                                                                                      |
| `RouteUrlOptions<Route>`                                       | Route URL params/search/hash options.                                                                                                                                                                                                            |
| `RouterContracts`                                              | Generated contract container.                                                                                                                                                                                                                    |
| `Register`                                                     | Module augmentation target.                                                                                                                                                                                                                      |
| `RouterNavigationState`                                        | Navigation state union.                                                                                                                                                                                                                          |
| `RouteMatch`, `MatchedRoute`, `NormalizedRoute`, `RankedRoute` | Matching and normalized route structures.                                                                                                                                                                                                        |
| `Middleware`, `MiddlewareContext`, `MiddlewareResult`          | Middleware API.                                                                                                                                                                                                                                  |
| `RouteLifecycle`, `GlobalLifecycle`, `RouteLifecycleContext`   | Lifecycle API.                                                                                                                                                                                                                                   |

## `@cookbook/router-react`

Install the React integration:

```sh
pnpm add @cookbook/router @cookbook/router-react react react-dom
```

Requirements:

- Node.js `>=18`
- `react >=18`
- `react-dom >=18`
- A router instance from `@cookbook/router`

Related: [React integration guide](react-integration.md).

### React components

#### `RouterProvider(props)`

```ts
interface RouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
  readonly scrollRestoration?: boolean;
  readonly scrollBehavior?: ScrollBehavior;
}

function RouterProvider(props: RouterProviderProps): ReactElement;
```

Renders the active route branch for a live router. If `children` are provided, they are rendered inside the router context instead of the default route renderer. `fallback` is not-found UI, `loadingFallback` is the global Suspense fallback, and `errorFallback` is the global React render-error fallback. When `scrollRestoration` is enabled, the provider stores scroll positions by router location key and restores them on navigation; new non-hash locations scroll to the top.

```tsx
<RouterProvider
  router={router}
  fallback={<NotFoundPage />}
  loadingFallback={<AppSkeleton />}
  errorFallback={AppErrorFallback}
  scrollBehavior="smooth"
  scrollRestoration
/>
```

> `scrollBehavior` defaults to "auto". Use "smooth" only when animated restoration is desired. Hash navigation is not force-scrolled to the top.

#### `StaticRouterProvider(props)`

```ts
interface StaticRouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
}

function StaticRouterProvider(props: StaticRouterProviderProps): ReactElement;
```

Use with `createStaticRouter()` during SSR.

#### `Link(props)`

```ts
interface LinkProps<Route extends RouteId = RouteId> extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  readonly route?: Route;
  readonly to?: Route;
  readonly href?: string;
  readonly params?: HrefOptions<Route>['params'];
  readonly search?: HrefOptions<Route>['search'];
  readonly hash?: HrefOptions<Route>['hash'];
  readonly url?: HrefOptions<Route>['url'];
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly preventScrollReset?: boolean;
  readonly replace?: boolean;
  readonly children?: ReactNode;
}

function Link<Route extends RouteId = RouteId>(props: LinkProps<Route>): JSX.Element;
```

Use `to` for internal typed navigation and `href` for literal links. Params, search, and hash are URLKit-backed; `{id:int}` params are numbers, and static `date` / `date-time` search fields are parsed as UTC `Date` values. `url` accepts URL-building options such as `arrayFormat` and `defaults`. Route-resolution policies such as `invalidSearch`, `invalidHash`, and `unknownSearch` belong on the core router, route definitions, explicit match calls, or static router creation.

```tsx
<Link to="users.show" params={{ id: 42 }} search={{ tab: 'settings' }} hash="profile">
  Open user
</Link>

<Link
  to="products"
  search={{ tags: ['router', 'typescript'] }}
  url={{ arrayFormat: 'comma' }}
>
  Products
</Link>
```

`Link` preserves native browser behavior for modified clicks, non-left clicks, external links, `target="_blank"`, and downloads.

#### `NavLink(props)`

```ts
interface NavLinkRenderProps {
  readonly isActive: boolean;
}

interface NavLinkProps<Route extends RouteId = RouteId> extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'href'
> {
  readonly route?: Route;
  readonly to?: Route;
  readonly params?: HrefOptions<Route>['params'];
  readonly search?: HrefOptions<Route>['search'];
  readonly hash?: HrefOptions<Route>['hash'];
  readonly url?: HrefOptions<Route>['url'];
  readonly replace?: boolean;
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly preventScrollReset?: boolean;
  readonly end?: boolean | { readonly search?: 'all' | 'ignore' };
  readonly children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
}

function NavLink<Route extends RouteId = RouteId>(props: NavLinkProps<Route>): JSX.Element;
```

```tsx
<NavLink to="users.show" params={{ id: 42 }} end>
  {({ isActive }) => <span data-active={isActive}>User</span>}
</NavLink>
```

#### `Outlet(props)`

```ts
interface OutletProps<T = unknown> {
  readonly context?: T;
  readonly children?: ReactNode;
}

function Outlet<T = unknown>(props: OutletProps<T>): ReactElement | null;
```

Renders the next primary child branch and optionally provides outlet context.

#### `Slot(props)`

```ts
interface SlotProps<T = unknown> {
  readonly name: string;
  readonly context?: T;
}

function Slot<T = unknown>(props: SlotProps<T>): ReactElement | null;
```

Renders a named layout slot. A slot can render a matched slot route, fallback, intercepted destination, not-found view, or nothing.

### React hooks

| Hook               | Signature                                                                                                       | Purpose                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `useRouter`        | `() => Router`                                                                                                  | Read the current router instance.                         |
| `useNavigate`      | `() => Router['navigate']`                                                                                      | Read navigation methods.                                  |
| `useHref`          | `(routeId, options?) => string` or `(options) => string`                                                        | Generate a route href.                                    |
| `useLocation`      | `() => RouterLocation`                                                                                          | Read the current location.                                |
| `useMatches`       | `() => readonly MatchedRoute[]`                                                                                 | Read the active matched branch.                           |
| `useNavigation`    | `() => RouterNavigationState`                                                                                   | Read transition state.                                    |
| `useParams`        | `(routeId?) => RouteParams<Route>`                                                                              | Read current or route-specific params.                    |
| `useSearchParams`  | `(routeId?) => RouteSearch<Route>`                                                                              | Read already-resolved URLKit-parsed search params.        |
| `useSearch`        | `(routeId?) => RouteSearch<Route>`                                                                              | Alias for `useSearchParams`.                              |
| `useHashParams`    | `(routeId?) => RouteHash<Route> \| null`                                                                        | Read already-resolved URLKit-parsed hash.                 |
| `useHash`          | `(routeId?) => RouteHash<Route> \| null`                                                                        | Alias for `useHashParams`.                                |
| `useOutletContext` | `() => unknown`, `<Route>(routeId, options?) => RouteOutletContext<Route>`, or `<Context>(options?) => Context` | Read nearest outlet/slot context.                         |
| `useBlocker`       | `(options: UseBlockerOptions) => BlockerState`                                                                  | Block in-app navigation and browser unload while enabled. |

```tsx
function UserPage() {
  const params = useParams('users.show');
  const search = useSearchParams('users.show');
  const navigate = useNavigate();

  return (
    <button onClick={() => void navigate.replace({ route: 'users.show', params })}>
      Refresh {search.tab ?? 'details'}
    </button>
  );
}
```

#### `useBlocker(options)`

```ts
interface UseBlockerOptions {
  readonly when: boolean;
  readonly message?: string;
}

interface BlockerState {
  readonly blocked: boolean;
}
```

When enabled, this registers a router navigation blocker and a browser unload blocker. Returning/cancelling the in-app confirmation keeps the current route active and sets navigation state to `blocked`. Browsers control unload confirmation text; custom browser unload messages are not guaranteed.

### React contexts and render helpers

The React package also exports advanced integration helpers:

| API                                                              | Purpose                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `renderReactRouteMatch(match, fallback, options?)`               | Render a resolved route match with the React adapter.                  |
| `renderRouteBoundary(match, element)`                            | Wrap one matched route element in its route-level Suspense/error UI.   |
| `useRouterState(router)`                                         | Subscribe to a router and return state.                                |
| `RouterContext`                                                  | Router/state context.                                                  |
| `OutletContext`                                                  | Outlet content/context provider.                                       |
| `RouteRenderContext`                                             | Current matched route render context.                                  |
| `SlotRenderContext`                                              | Slot render context.                                                   |
| `useRouterContext()`                                             | Read `RouterContext` and throw if missing.                             |
| `shouldPreserveBrowserBehavior(event, href, target?, download?)` | Determine whether an anchor click should keep native browser behavior. |

Most applications should not need these APIs directly.

### React types

Exported React types include:

- `LinkProps`
- `NavLinkProps`
- `NavLinkRenderProps`
- `OutletProps`
- `SlotProps`
- `RenderReactRouteMatchOptions`
- `RouteErrorFallbackProps`
- `RouteLoadingFallbackProps`
- `RouterErrorFallbackProps`
- `RouterProviderProps`
- `StaticRouterProviderProps`
- `OutletContextOptions`
- `RouterContextValue`
- `OutletContextValue`
- `RouteRenderContextValue`
- `SlotRenderContextValue`
- `BlockerState`
- `UseBlockerOptions`
- `Register`, `RegisteredContracts`, and `RouterContracts` re-exported for contract augmentation compatibility

## `@cookbook/router-cli`

Install the CLI as a development dependency:

```sh
pnpm add -D @cookbook/router-cli
```

The CLI depends on `@cookbook/router`. Route files commonly import `defineRoutes` from `@cookbook/router`.

Related: [Code generation](codegen.md), [Contracts](contracts.md).

### CLI binaries

The package publishes two equivalent binaries:

```sh
cookbook-router --help
cbr --help
```

`cbr` is a shorthand alias for `cookbook-router`.

### CLI commands

```sh
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router validate --routes src/routes.tsx
cookbook-router manifest --routes src/routes.tsx --out-dir .cookbook-router
cookbook-router generate --routes src/routes.tsx --out-dir .cookbook-router --watch
```

Options:

| Option            | Applies to                      | Purpose                                           |
| ----------------- | ------------------------------- | ------------------------------------------------- |
| `--routes <file>` | All commands                    | Route source file. May be repeated.               |
| `--routes=<file>` | All commands                    | Equals-form route source file. May be repeated.   |
| `--out-dir <dir>` | `generate`, `manifest`, `watch` | Output directory. Defaults to `.cookbook-router`. |
| `--out-dir=<dir>` | `generate`, `manifest`, `watch` | Equals-form output directory.                     |
| `--watch`         | `generate`                      | Generate once and keep watching route files.      |
| `-h`, `--help`    | CLI                             | Print help.                                       |
| `-v`, `--version` | CLI                             | Print version.                                    |

Exit behavior:

- Successful commands exit `0`.
- Invalid command input, validation errors, and generation errors exit `1`.
- `validate` writes no files.
- `generate --watch` return the initial command status, keep the process alive, and regenerate after route file changes.

### Programmatic command APIs

#### `generateCommand(options)`

```ts
interface GenerateOptions extends CliRouteOptions {}
function generateCommand(options: GenerateOptions): Promise<CommandResult>;
```

Generates `contracts.ts`, `register.d.ts`, and `manifest.json`.

#### `manifestCommand(options)`

```ts
interface ManifestOptions extends CliRouteOptions {}
function manifestCommand(options: ManifestOptions): Promise<CommandResult>;
```

Generates only `manifest.json`.

#### `validateCommand(options)`

```ts
interface ValidateOptions extends CliRouteOptions {}
function validateCommand(options: ValidateOptions): Promise<CommandResult>;
```

Validates routes without writing generated files.

#### `watchCommand(options)`

```ts
interface WatchCommandOptions extends WatchOptions {}
function watchCommand(options: WatchCommandOptions): WatchHandle;

interface WatchHandle {
  readonly initial: Promise<CommandResult>;
  close: () => void;
}
```

Generates once, watches route files, debounces rapid file-system events, and calls `onChange` for the initial result and each regeneration result. `routeFiles` is required because watch mode cannot observe in-memory route arrays.

```ts
import { generateCommand, validateCommand, watchCommand } from '@cookbook/router-cli';

await validateCommand({ routeFiles: ['src/routes.tsx'] });
await generateCommand({ routeFiles: ['src/routes.tsx'], outDir: '.cookbook-router' });

const watcher = watchCommand({
  routeFiles: ['src/routes.tsx'],
  outDir: '.cookbook-router',
  onChange(result) {
    if (!result.ok) {
      console.error(result.errors.join('\n'));
    }
  },
});

await watcher.initial;

watcher.close();
```

#### `resolveRoutes(options)`

```ts
function resolveRoutes(options: CliRouteOptions): Promise<readonly RouteDefinition[]>;
```

Resolves routes from `options.routes` or from files listed in `options.routeFiles`.

### Generation APIs

```ts
function generateContracts(routes: readonly RouteDefinition[]): string;
function generateRegister(): string;
function generateManifest(routes: readonly RouteDefinition[]): RouteManifest;
function serializeManifest(manifest: RouteManifest): string;
```

```ts
interface ManifestRoute {
  readonly id: string;
  readonly path?: string;
  readonly parentId?: string;
  readonly index: boolean;
}

interface RouteManifest {
  readonly routes: readonly ManifestRoute[];
}
```

Use these APIs when embedding route-code generation into a custom build system.

### Route loading and validation APIs

```ts
function loadRouteFiles(options: LoadRouteFilesOptions): Promise<readonly CliRouteSource[]>;
function validateRouteFiles(options: LoadRouteFilesOptions): Promise<readonly CliRouteSource[]>;

interface LoadRouteFilesOptions {
  readonly routeFiles: readonly string[];
  readonly fs?: CliFileSystem;
}
```

### CLI runner APIs

These are public for tests and custom executable wrappers.

```ts
interface CliRunnerOptions {
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly version?: string;
}

function runCli(argv: readonly string[], runnerOptions?: CliRunnerOptions): Promise<number>;
function shouldRunCli(moduleUrl?: string, argv?: readonly string[]): boolean;
```

### CLI types

```ts
interface CliFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  mkdir(path: string, options?: { readonly recursive?: boolean }): Promise<void>;
  stat?(path: string): Promise<{ readonly mtimeMs?: number }>;
  watch?(
    path: string,
    listener: (event: 'rename' | 'change', filename: string | null) => void,
  ): { close: () => void };
}

interface CliRouteOptions {
  readonly routes?: readonly RouteDefinition[];
  readonly routeFiles?: readonly string[];
  readonly outDir?: string;
  readonly fs?: CliFileSystem;
}

interface CommandResult {
  readonly ok: boolean;
  readonly files: readonly string[];
  readonly errors: readonly string[];
}

interface WatchOptions extends CliRouteOptions {
  readonly debounceMs?: number;
  readonly onChange?: (result: CommandResult) => void | Promise<void>;
}
```

Other exported types:

- `CliOutputOptions`
- `RouteFile`
- `LoadRouteFilesOptions`
- `WatchOptions`
- `WatchHandle`
- `GenerateOptions`
- `ManifestOptions`
- `ValidateOptions`
- `WatchCommandOptions`
- `ManifestRoute`
- `RouteManifest`
- `Register`
- `RouterContracts`

## Contract registration

Generated contracts connect app-specific routes to the exported type helpers.

```ts
import type { RouterContracts } from './contracts';

declare module '@cookbook/router' {
  interface Register {
    contracts: RouterContracts;
  }
}

export {};
```

After generation and registration, these APIs become route-specific:

- `RouteId`
- `RouteParams<Route>`
- `RouteSearch<Route>`
- `RouteHash<Route>`
- `RouteHashInput<Route>`
- `RouteMeta<Route>`
- `RouteOutletContext<Route>`
- `RouteUrlOptions<Route>`

Related: [Contracts](contracts.md), [Code generation](codegen.md).

## Related docs

- [Getting started](getting-started.md)
- [Routing](routing.md)
- [Path routes and constraints](path-routes.md)
- [Navigation](navigation.md)
- [React integration](react-integration.md)
- [Code generation](codegen.md)
- [Contracts](contracts.md)
- [Middleware](middleware.md)
- [Lifecycle](lifecycle.md)
- [SSR](ssr.md)
- [Troubleshooting](troubleshooting.md)
- [Route validation errors](route-validation-errors.md)
