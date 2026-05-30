# API reference

This page documents the package-root public APIs exported by `@cookbook/router`, `@cookbook/router-react`, and `@cookbook/router-cli`.

Use this page with the package guides:

- [Getting started](getting-started.md)
- [Routing](routing.md)
- [Navigation](navigation.md)
- [React integration](react-integration.md)
- [Code generation](codegen.md)
- [SSR](ssr.md)
- [Troubleshooting](troubleshooting.md)

## Table of contents

- [`@cookbook/router`](#cookbookrouter)
  - [Route definition APIs](#route-definition-apis)
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
- `@cookbook/pathkit` is installed transitively

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

Use `pathConstraints` here when route paths reference custom pathkit constraints. `defineRoutes()` validates immediately, so constraints must be registered before validation.

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
      component: PostPage,
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
  readonly component?: RouteComponent;
  readonly layout?: RouteLayoutDefinition;
  readonly children?: readonly RouteDefinition[];
  readonly intercepts?: RouteIntercepts;
  readonly redirect?: RouteRedirect;
  readonly search?: RouteSearchSchema;
  readonly hash?: readonly string[];
  readonly meta?: RouteMeta;
  readonly loading?: RouteComponent;
  readonly errorFallback?: RouteComponent;
  readonly lifecycle?: RouteLifecycle;
  readonly middleware?: readonly Middleware[];
}
```

| Field           | Purpose                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`            | Stable public route ID used by links, hrefs, navigation, redirects, generated contracts, and tests.                       |
| `path`          | Local path segment or absolute path. Index routes must not define `path`.                                                 |
| `index`         | Marks the route as the default child for its parent path.                                                                 |
| `component`     | Route component or framework-owned render value. The core package treats it as `unknown`.                                 |
| `layout`        | Layout component and named slot definitions.                                                                              |
| `children`      | Primary child routes.                                                                                                     |
| `intercepts`    | Configured route interception targets for named slots.                                                                    |
| `redirect`      | Internal route redirect object or literal href string.                                                                    |
| `search`        | Search key schema used by generated contracts. `type: 'one'` is a single value; `type: 'many'` is a repeated query param. |
| `hash`          | Allowed hash values used by generated contracts.                                                                          |
| `meta`          | Arbitrary route metadata.                                                                                                 |
| `loading`       | Route-level React Suspense fallback component for loading route subtrees.                                                 |
| `errorFallback` | Route-level React error-boundary fallback component for render errors in route subtrees.                                  |
| `lifecycle`     | Route lifecycle hooks.                                                                                                    |
| `middleware`    | Route-specific middleware pipeline.                                                                                       |

Related: [Routing](routing.md), [Search and hash](search-and-hash.md), [Middleware](middleware.md), [Lifecycle](lifecycle.md).

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
  readonly maxRedirectDepth?: number;
  readonly maxRedirectionDepth?: number;
}
```

```ts
import { createRouter } from '@cookbook/router';
import { routes } from './routes';

const router = createRouter({
  routes,
  basename: '/app',
  maxRedirectDepth: 10,
  pathOptions: { prune: 'all' },
});

await router.resolveCurrent();
```

| Option                |                   Default | Purpose                                                                                           |
| --------------------- | ------------------------: | ------------------------------------------------------------------------------------------------- |
| `routes`              |                  Required | Route tree.                                                                                       |
| `basename`            |               `undefined` | URL prefix stripped during matching and added during href generation.                             |
| `middleware`          |                      `[]` | Global middleware.                                                                                |
| `lifecycle`           |                      `{}` | Global lifecycle hooks.                                                                           |
| `hydrationData`       |               `undefined` | State from SSR serialization.                                                                     |
| `history`             | Browser or memory history | Custom history implementation.                                                                    |
| `pathOptions`         |        `{ prune: 'all' }` | Pathkit behavior.                                                                                 |
| `pathConstraints`     |               `undefined` | Custom constraints for unvalidated route arrays. Prefer `defineRoutes(..., { pathConstraints })`. |
| `maxRedirectDepth`    |    Implementation default | Redirect loop guard.                                                                              |
| `maxRedirectionDepth` |                     Alias | Backward-compatible alias for `maxRedirectDepth`.                                                 |

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

await router.resolveCurrent();
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

await router.resolveCurrent();
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

  resolve<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): RouterLocation;
  resolve<Route extends string>(routeId: Route, options?: HrefOptions<Route>): RouterLocation;
  resolve<Route extends RouteId>(options: NavigateOptions<Route>): RouterLocation;
  resolve<Route extends string>(options: NavigateOptions<Route>): RouterLocation;

  match(href: string): RouteMatch<RouteId> | null;

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
  resolveCurrent(): Promise<RouterState>;
  serialize(): SerializedRouterState;
}
```

Prefer object-form navigation for new code because it is easier to refactor and mirrors generated contract names:

```ts
await router.navigate.to({
  route: 'users.show',
  params: { id: '42' },
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
}

interface NavigateOptions<Route extends string> extends HrefOptions<Route> {
  readonly route: Route;
}
```

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

| API               | Signature                                                                                                               | Use case                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `validateRoutes`  | `(routes: readonly RouteDefinition[], pathOptions?: RouterPathOptions) => void`                                         | Validate route tree shape and throw on invalid config.   |
| `normalizeRoutes` | `(routes: readonly RouteDefinition[], pathOptions?: RouterPathOptions) => readonly NormalizedRoute[]`                   | Convert route definitions into normalized route records. |
| `matchRoutes`     | `(routes: readonly NormalizedRoute[], pathname: string, pathOptions?: RouterPathOptions) => RouteMatch<string> \| null` | Match a pathname against normalized routes.              |

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
): RouterLocation;
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

Middleware and lifecycle hooks are configured through `createRouter()` and route definitions. The package root does not expose the internal middleware, lifecycle, or transition runner functions as public v1 APIs.

Related: [Middleware](middleware.md), [Lifecycle](lifecycle.md).

### Slots and intercept APIs

`@cookbook/router-react` uses `getResolvedSlot()` internally to render layout slots. Application code should usually use `<Slot name="..." />` instead.

```ts
function getResolvedSlot(
  slots: ResolvedSlots,
  ownerRouteId: string,
  slotName: string,
): ResolvedSlot | undefined;
```

Intercept configuration is part of route definitions and navigation options. The package root exposes the intercept input types, but not the internal intercept resolver helpers as public v1 APIs.

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

`@cookbook/router` re-exports selected `@cookbook/pathkit` constraint helpers.

```ts
function createConstraint(definition: ConstraintDefinition): RouterPathConstraint;
function registerPathConstraints(constraints: RouterPathConstraints): void;
function hasConstraint(name: string): boolean;
function getConstraint(name: string): RouterPathConstraint | undefined;
function unregisterConstraint(name: string): void;
```

Use custom constraints when route params need non-default matching rules:

```ts
const uuid = createConstraint({
  parse(paramName, value) {
    if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
      throw new Error(`${paramName} must be a UUID.`);
    }
  },
  verify() {},
  toRegExp() {
    return '[0-9a-fA-F-]{36}';
  },
});

const routes = defineRoutes([{ id: 'users.show', path: '/users/{id:uuid}' }] as const, {
  pathConstraints: { uuid },
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

| Type                                                           | Purpose                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `RouteId`                                                      | Registered route ID union. Falls back to `string` before contracts are generated. |
| `RouteParams<Route>`                                           | Params for a registered route.                                                    |
| `RouteSearch<Route>`                                           | Search object for a registered route.                                             |
| `RouteHash<Route>`                                             | Hash value for a registered route.                                                |
| `RouteHashInput<Route>`                                        | Input accepted for route hash generation.                                         |
| `RouteMeta<Route>` / `RegisteredRouteMeta<Route>`              | Metadata for a registered route.                                                  |
| `RouteOutletContext<Route>`                                    | Outlet context type for a registered route.                                       |
| `RouteUrlOptions<Route>`                                       | Route URL params/search/hash options.                                             |
| `RouterContracts`                                              | Generated contract container.                                                     |
| `Register`                                                     | Module augmentation target.                                                       |
| `RouterNavigationState`                                        | Navigation state union.                                                           |
| `RouteMatch`, `MatchedRoute`, `NormalizedRoute`, `RankedRoute` | Matching and normalized route structures.                                         |
| `Middleware`, `MiddlewareContext`, `MiddlewareResult`          | Middleware API.                                                                   |
| `RouteLifecycle`, `GlobalLifecycle`, `RouteLifecycleContext`   | Lifecycle API.                                                                    |

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
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly replace?: boolean;
  readonly children?: ReactNode;
}

function Link<Route extends RouteId = RouteId>(props: LinkProps<Route>): JSX.Element;
```

Use `to` for internal typed navigation and `href` for literal links.

```tsx
<Link to="users.show" params={{ id: '42' }} search={{ tab: 'settings' }} hash="profile">
  Open user
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
  readonly replace?: boolean;
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly end?: boolean;
  readonly children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
}

function NavLink<Route extends RouteId = RouteId>(props: NavLinkProps<Route>): JSX.Element;
```

```tsx
<NavLink to="users.show" params={{ id: '42' }} end>
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

Renders a named layout slot. A slot can render a matched slot route, fallback, intercepted destination, not-found component, or nothing.

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
| `useSearchParams`  | `(routeId?) => RouteSearch<Route>`                                                                              | Read parsed search params.                                |
| `useHashParams`    | `(routeId?) => RouteHash<Route> \| null`                                                                        | Read hash without `#`.                                    |
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

When enabled, this registers a router navigation blocker and a browser unload blocker. Returning/cancelling the confirmation keeps the current route active and sets navigation state to `blocked`.

### React contexts and render helpers

The React package also exports advanced integration helpers:

| API                                                              | Purpose                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `renderMatches(matches, fallback, slots?, options?)`             | Render a matched branch manually.                                      |
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
- `RenderMatchesOptions`
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
- [Navigation](navigation.md)
- [React integration](react-integration.md)
- [Code generation](codegen.md)
- [Contracts](contracts.md)
- [Middleware](middleware.md)
- [Lifecycle](lifecycle.md)
- [SSR](ssr.md)
- [Troubleshooting](troubleshooting.md)
