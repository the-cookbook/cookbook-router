import type { UnknownSearchBehavior, UnknownSearchParams } from '@cookbook/urlkit';
import type { RouterPathConstraints, RouterPathMatchOptions } from '../path';
export type { RouterPathMatchOptions };
import type {
  RouteDefinition,
  RouteHashSchema,
  RouteSearchSchema,
} from '../route-config/contracts';

/**
 * Array serialization strategy used when URLKit parses or builds repeated
 * search params for router-owned URLs.
 *
 * `repeat` writes `?tag=a&tag=b`. `comma` writes `?tag=a,b`.
 */
export type RouterUrlArrayFormat = 'repeat' | 'comma';

/** Controls how URLKit handles undeclared query-string params. */
export type RouterUnknownSearchPolicy = UnknownSearchBehavior;

/** Unknown query-string keys preserved by URLKit when `unknownSearch` is `preserve`. */
export type RouterUnknownSearchParams = UnknownSearchParams;

/**
 * Controls how invalid declared search or hash URL state is handled after the
 * path has already matched.
 *
 * - `recover` keeps the page route matched when URLKit can omit invalid
 *   optional/defaulted values. Required invalid values still propagate.
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
 * URL-state options used by route resolution.
 *
 * These options may affect route matching, fallback behavior, or route error
 * state and should only be used by router-level defaults, route-level
 * overrides, and explicit matching/static-resolution APIs.
 */
export interface RouterUrlOptions {
  /** Controls how repeated search params are parsed and serialized by URLKit. */
  readonly arrayFormat?: RouterUrlArrayFormat;
  /** Controls whether URLKit serializes fields equal to descriptor defaults while building. */
  readonly defaults?: 'include' | 'omit';
  /**
   * Controls recovery for invalid declared search params. Defaults to
   * `recover`, so malformed optional/defaulted query-string state does not
   * break page route matching unless strict behavior is requested.
   */
  readonly invalidSearch?: RouterInvalidUrlStatePolicy;
  /**
   * Controls recovery for invalid declared hash state. Defaults to `recover`,
   * matching search-param behavior.
   */
  readonly invalidHash?: RouterInvalidUrlStatePolicy;
  /**
   * Controls undeclared search params. URLKit defaults to `strip`, meaning
   * unknown query-string keys are omitted from typed parsed search state.
   */
  readonly unknownSearch?: RouterUnknownSearchPolicy;
  /** Controls supported path matching behavior for serialized URL input. */
  readonly pathMatch?: RouterPathMatchOptions;
}

/**
 * URL options supported by href-building APIs.
 *
 * Build-time options must not expose route-resolution policies because they do
 * not decide whether the current location matches a route.
 */
export interface RouterUrlBuildOptions {
  /** Controls how repeated search params are serialized by URLKit. */
  readonly arrayFormat?: RouterUrlArrayFormat;
  /** Controls whether URLKit serializes fields equal to descriptor defaults. */
  readonly defaults?: 'include' | 'omit';
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
  /** Route id used only for diagnostics when URLKit rejects a route URL descriptor. */
  readonly routeId?: string;
}

/** URLKit route-contract parse options after router policy mapping. */
export interface RouterRouteSearchParseOptions extends RouterPathMatchOptions {
  readonly arrayFormat?: RouterUrlArrayFormat;
  readonly unknownSearch?: RouterUnknownSearchPolicy;
  readonly invalidSearch?: 'error' | 'omit';
}

/**
 * Minimal URLKit route contract surface currently required by the router.
 * Keeping this narrow lets the router adopt URLKit incrementally without
 * exposing URLKit internals through public runtime state.
 */
export interface RouterRouteUrlContract {
  readonly pattern: string | undefined;
  parse(input: string | URL, options?: RouterRouteSearchParseOptions): unknown;
  match(input: string | URL, options?: RouterRouteSearchParseOptions): boolean;
  build(input: unknown, options?: RouterUrlBuildOptions): string;
  parsePathname: ((pathname: string, options?: RouterPathMatchOptions) => unknown) | never;
  buildPath: ((params: unknown) => string) | never;
  parseSearch(input: string | URLSearchParams, options?: RouterRouteSearchParseOptions): unknown;
  buildSearch(search: unknown, options?: RouterUrlBuildOptions): string;
  parseHash(input: unknown): unknown;
  buildHash(hash?: unknown, options?: RouterUrlBuildOptions): string;
}

export type UrlContractRouteDescriptor = Pick<RouteDefinition, 'path' | 'search' | 'hash' | 'url'>;
