import type { RouterPathConstraints } from '../pathkit/pathkit';
import type { RouteDefinition, RouteHashSchema, RouteSearchSchema } from '../routes/contracts';

/**
 * Array serialization strategy used when URLKit parses or builds repeated
 * search params for router-owned URLs.
 *
 * `repeat` writes `?tag=a&tag=b`. `comma` writes `?tag=a,b`.
 */
export type RouterUrlArrayFormat = 'repeat' | 'comma';

/**
 * Controls how invalid declared search or hash URL state is handled after the
 * path has already matched.
 *
 * - `recover` keeps the page route matched. Invalid values are treated as
 *   missing, descriptor defaults apply when present, and fields without
 *   defaults resolve to `undefined`/absence.
 * - `no-match` rejects the route candidate so normal fallback/not-found route
 *   matching can continue.
 * - `error` keeps the path route matched and surfaces the URL state parse
 *   failure through router error state so integrations can render error
 *   fallbacks.
 */
export type RouterInvalidUrlStatePolicy = 'recover' | 'no-match' | 'error';

/** @deprecated Use {@link RouterInvalidUrlStatePolicy}. */
export type RouterInvalidSearchBehavior = RouterInvalidUrlStatePolicy;

/**
 * URL-state options shared by router-level defaults, route-level overrides, and
 * per-call/hook/component overrides.
 */
export interface RouterUrlOptions {
  /** Controls how repeated search params are parsed and serialized by URLKit. */
  readonly arrayFormat?: RouterUrlArrayFormat;
  /**
   * Controls recovery for invalid declared search params. Defaults to
   * `recover`, so malformed query-string state does not break page route
   * matching unless strict behavior is requested.
   */
  readonly invalidSearch?: RouterInvalidUrlStatePolicy;
  /**
   * Controls recovery for invalid declared hash state. Defaults to `recover`,
   * matching search-param behavior.
   */
  readonly invalidHash?: RouterInvalidUrlStatePolicy;
}

/**
 * Inputs used to resolve effective URLKit behavior for a route operation.
 */
export interface ResolveUrlOptionsInput {
  readonly router?: RouterUrlOptions;
  readonly route?: RouterUrlOptions;
  readonly call?: RouterUrlOptions;
}

/**
 * Static URL descriptor shape consumed by the router URL module before it is
 * forwarded to URLKit's router runtime.
 */
export interface RouterRouteUrlDescriptor {
  readonly path?: string;
  readonly search?: RouteSearchSchema;
  readonly hash?: RouteHashSchema;
  readonly url?: RouterUrlOptions;
}

/**
 * Options used when compiling one route's URLKit contract.
 */
export interface CreateRouterRouteUrlContractOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

/**
 * Minimal URLKit route contract surface currently required by the router.
 * Keeping this narrow lets the router adopt URLKit incrementally without
 * exposing URLKit internals through public runtime state.
 */
export interface RouterRouteUrlContract {
  readonly pattern: string | undefined;
  parse(input: string | URL, options?: RouterUrlOptions): unknown;
  match(input: string | URL, options?: RouterUrlOptions): boolean;
  build(input: unknown, options?: RouterUrlOptions): string;
  parsePathname: ((pathname: string) => unknown) | never;
  buildPath: ((params: unknown) => string) | never;
  parseSearch(input: string | URLSearchParams, options?: RouterUrlOptions): unknown;
  buildSearch(search: unknown, options?: RouterUrlOptions): string;
  parseHash(input: unknown): unknown;
  buildHash(hash?: unknown): string;
}

export type UrlContractRouteDescriptor = Pick<RouteDefinition, 'path' | 'search' | 'hash' | 'url'>;
