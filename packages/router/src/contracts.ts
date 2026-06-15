/**
 * Module augmentation entrypoint for generated route contracts.
 *
 * The CLI usually generates this augmentation so router and React APIs can infer
 * valid route ids, params, search values, hashes, metadata, and outlet context.
 *
 * @example
 * declare module '@cookbook/router' {
 *   interface Register {
 *     contracts: RouterContracts;
 *   }
 * }
 */
export interface Register {}

/**
 * Complete generated contract model for a route tree.
 *
 * Most applications should not author this by hand; `@cookbook/router-cli`
 * generates it from `defineRoutes` route files and consumers register it through
 * module augmentation.
 */
export interface RouterContracts {
  params?: Record<string, Record<string, unknown>>;
  paramsInput?: Record<string, Record<string, unknown>>;
  search?: Record<string, Record<string, unknown>>;
  searchInput?: Record<string, Record<string, unknown>>;
  hash?: Record<string, string | undefined | never>;
  meta?: Record<string, Record<string, unknown>>;
  paths?: Record<string, string>;
  outletContext?: Record<string, unknown>;
}

/**
 * Active contract model after module augmentation, or the permissive fallback
 * contract when no generated contracts are registered.
 */
export type RegisteredContracts = Register extends {
  contracts: infer Contracts;
}
  ? Contracts
  : RouterContracts;

/**
 * Prevents TypeScript from widening a caller-provided route id while preserving
 * the registered route contract relationship.
 */
export type NoInferRoute<T> = [T][T extends unknown ? 0 : never];

/**
 * Union of generated route ids when contracts are registered.
 *
 * Falls back to `string` so the core router remains usable without codegen.
 */
export type RouteId = RegisteredContracts extends {
  paths: infer Paths;
}
  ? keyof Paths & string
  : string;

/**
 * Params contract for a route id.
 *
 * Generated from path parameters such as `{id:int}` or `{*path}`. Unknown routes
 * fall back to a loose record.
 */
export type RouteParams<Route extends string> = RegisteredContracts extends {
  params: infer Params;
}
  ? Route extends keyof Params
    ? Params[Route]
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Params input contract for href generation and navigation. Wildcard params
 * accept a slash-delimited string or an array of path segments.
 */
export type RouteParamsInput<Route extends string> = RegisteredContracts extends {
  paramsInput: infer ParamsInput;
}
  ? Route extends keyof ParamsInput
    ? ParamsInput[Route]
    : RouteParams<Route>
  : RouteParams<Route>;

/**
 * Search contract for a route id generated from the route's `search` schema.
 */
export type RouteSearch<Route extends string> = RegisteredContracts extends {
  search: infer Search;
}
  ? Route extends keyof Search
    ? Search[Route]
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Search input contract for a route id used by href generation and navigation.
 * Fields with descriptor defaults are optional here even though they are present
 * in parsed route state.
 */
export type RouteSearchInput<Route extends string> = RegisteredContracts extends {
  searchInput: infer SearchInput;
}
  ? Route extends keyof SearchInput
    ? SearchInput[Route]
    : RouteSearch<Route>
  : RouteSearch<Route>;

/**
 * Allowed hash fragment contract for a route id.
 */
export type RouteHash<Route extends string> = RegisteredContracts extends {
  hash: infer Hash;
}
  ? Route extends keyof Hash
    ? Hash[Route]
    : string | null
  : string | null;

/**
 * Accepted hash input for href generation and navigation.
 *
 * Callers may pass the bare generated hash value, a `#`-prefixed version, or
 * `null` to omit the hash when the route allows one. Routes with `never` hashes
 * reject hash input in typed call sites.
 */
export type RouteHashInput<Route extends string> = [RouteHash<Route>] extends [never]
  ? never
  :
      | RouteHash<Route>
      | null
      | (Extract<RouteHash<Route>, string> extends infer HashString
          ? HashString extends string
            ? `#${HashString}`
            : never
          : never);

/**
 * Metadata contract for a route id.
 */
export type RouteMeta<Route extends string> = RegisteredContracts extends {
  meta: infer Meta;
}
  ? Route extends keyof Meta
    ? Meta[Route]
    : Record<string, unknown>
  : Record<string, unknown>;

/**
 * Outlet context type exposed by a route to descendant renderers.
 */
export type RouteOutletContext<Route extends string> = RegisteredContracts extends {
  outletContext: infer OutletContext;
}
  ? Route extends keyof OutletContext
    ? OutletContext[Route]
    : unknown
  : unknown;

/**
 * URL generation inputs shared by `router.href`, `router.resolve`, `Link`, and
 * navigation methods.
 */
export interface RouteUrlOptions<Route extends string> {
  readonly params?: RouteParamsInput<Route>;
  readonly search?: RouteSearchInput<Route>;
  readonly hash?: RouteHashInput<Route>;
}

/**
 * URL options plus navigation-mode flags used by higher-level integrations.
 */
export interface RouteNavigationOptions<Route extends string> extends RouteUrlOptions<Route> {
  readonly replace?: boolean;
}
