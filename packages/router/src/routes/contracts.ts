import type { RouterLocation } from '../history/memory-history';
import type { RouterPathOptions } from '../pathkit/pathkit';
import type { RouteHashInput, RouteId, RouteParams, RouteSearch } from '../contracts';

/**
 * Component-like value consumed by router integrations.
 *
 * The core package keeps this intentionally opaque so React, SSR, or other
 * renderers can provide their own component model without coupling the route
 * contract to a framework.
 */
export type RouteComponent = unknown;
/**
 * Arbitrary metadata attached to authored, normalized, and matched routes.
 *
 * Metadata is never interpreted by the core router; consumers can use it for
 * breadcrumbs, authorization hints, analytics, titles, or layout decisions.
 */
export type RouteMeta = Record<string, unknown>;
/**
 * Declares whether a search parameter accepts a single value or repeated values.
 */
export type RouteSearchValueType = 'one' | 'many';

/**
 * Schema entry for one search parameter in an authored route.
 *
 * `type: 'one'` reads the first value as a string. `type: 'many'` keeps all
 * repeated values as an array. Required entries are validated during href
 * generation when generated contracts are available.
 */
export interface RouteSearchValueSchema {
  readonly type: RouteSearchValueType;
  readonly optional?: boolean;
}

/**
 * Search schema keyed by query-string parameter name.
 *
 * The CLI uses this to generate typed `search` contracts for links, hrefs, and
 * navigation calls.
 */
export type RouteSearchSchema = Readonly<Record<string, RouteSearchValueSchema>>;
export type { RouterPathOptions };

/**
 * Target route id or route ids that a configured intercept can handle.
 */
export type RouteInterceptTarget = string | readonly string[];

/**
 * Defines one route-configured intercept for a named slot.
 *
 * Configured intercepts are automatic: client navigation from the source route
 * to `to` renders `component` in the slot while preserving the source branch.
 * Direct visits to the target route render the canonical target route instead.
 */
export interface RouteInterceptConfig {
  readonly to: RouteInterceptTarget;
  readonly component: RouteComponent;
}

/**
 * Intercepts keyed by slot name on the route that owns the source context.
 */
export type RouteIntercepts = Readonly<Record<string, RouteInterceptConfig>>;

/**
 * Static redirect declared on a route.
 *
 * String values are used as absolute or app-relative hrefs. Object values use a
 * route id with typed params, search, and hash to generate the redirect href.
 */
export type RouteRedirect =
  | string
  | {
      readonly route: string;
      readonly params?: Record<string, unknown>;
      readonly search?: Record<string, unknown>;
      readonly hash?: string | null;
    };

/**
 * Authored configuration for a named layout slot.
 *
 * A slot can provide a fallback component, its own nested route tree, and metadata
 * consumed by rendering integrations.
 */
export interface RouteSlotConfig {
  readonly component?: RouteComponent;
  readonly routes?: readonly RouteDefinition[];
  readonly meta?: RouteMeta;
}

/**
 * Authored slot shorthand.
 *
 * A component value becomes the slot fallback, an object configures routes and
 * metadata, and `true` enables the slot without fallback content.
 */
export type RouteSlotDefinition = RouteComponent | RouteSlotConfig | true;
/**
 * Layout slot definitions keyed by slot name.
 */
export type RouteSlotDefinitions = Readonly<Record<string, RouteSlotDefinition>>;

/**
 * Layout shell owned by a route.
 *
 * Layouts wrap descendant route content and can own shared loading/error
 * fallbacks and named slots. Use this when a route provides persistent UI around
 * nested branches.
 */
export interface RouteLayoutDefinition {
  /** Layout shell component that wraps descendant route content. */
  readonly component?: RouteComponent;
  /**
   * Shared loading fallback for content rendered inside this layout.
   *
   * Unlike `RouteDefinition.loading`, this fallback belongs to the layout shell
   * and can be reused while descendant route content is pending.
   */
  readonly loading?: RouteComponent;
  /** Shared error fallback for failures while rendering descendants inside this layout. */
  readonly error?: RouteComponent;
  /** Named slots rendered by this layout shell. */
  readonly slots?: RouteSlotDefinitions;
}

/**
 * Authored route definition consumed by `defineRoutes` and router creation.
 *
 * This is the user-facing configuration shape. Router creation normalizes these
 * records into `NormalizedRoute` entries with full paths, params, ranks, slot
 * ownership, and intercept metadata.
 */
export interface RouteDefinition {
  /**
   * Stable identifier used for typed navigation, href generation, route matching,
   * generated contracts, and diagnostics.
   *
   * Route ids must be unique across the normalized route tree.
   */
  readonly id: string;
  /**
   * Local path pattern for this route. Omit it for pathless layout routes.
   *
   * Patterns can include constrained params such as `{id:int}` and catch-all
   * params such as `{*path}`.
   */
  readonly path?: string;
  /** Marks the route as the index child for its parent path. */
  readonly index?: boolean;
  /** Route-local component rendered when this exact route participates in a match. */
  readonly component?: RouteComponent;
  /** Optional layout shell shared by descendant route content. */
  readonly layout?: RouteLayoutDefinition;
  /** Child routes nested under this route's path and layout context. */
  readonly children?: readonly RouteDefinition[];
  /** Automatic slot intercepts available while this route is the active source. */
  readonly intercepts?: RouteIntercepts;
  /** Static redirect evaluated when this route matches. */
  readonly redirect?: RouteRedirect;
  /** Search parameter schema used by generated contracts and href validation. */
  readonly search?: RouteSearchSchema;
  /** Allowed hash fragments for this route in generated contracts. */
  readonly hash?: readonly string[];
  /** User-defined metadata copied into normalized routes and matches. */
  readonly meta?: RouteMeta;
  /**
   * Loading fallback for this route's own component.
   *
   * This is route-local. It is used when the route component itself is pending.
   * It is not inherited by child routes and does not act as a shared layout
   * loading boundary.
   *
   * Use `layout.loading` when the route owns a layout shell and should provide
   * a shared loading fallback for descendants rendered inside that layout.
   */
  readonly loading?: RouteComponent;
  /** Route-local error fallback for this route's own component. */
  readonly error?: RouteComponent;
  /** Route-local lifecycle hooks for enter/leave/error behavior. */
  readonly lifecycle?: RouteLifecycle;
  /** Route-local middleware run when navigation resolves through this route. */
  readonly middleware?: readonly Middleware[];
}

/**
 * Name of the path constraint applied to a route parameter token.
 *
 * Built-in constraints come from `@cookbook/pathkit`; custom constraints can be
 * registered through `defineRoutes({ pathConstraints })` or router path options.
 */
export type RouteParamConstraint = string;

/**
 * Normalized description of one path parameter discovered from a route pattern.
 */
export interface RouteParamDefinition {
  readonly name: string;
  readonly constraint: RouteParamConstraint;
  readonly token: string;
}

/**
 * Normalized fallback component for a slot owned by a route layout.
 */
export interface NormalizedRouteSlotFallback {
  readonly ownerRouteId: string;
  readonly slotName: string;
  readonly component: RouteComponent;
  readonly meta?: RouteMeta;
}

/**
 * Normalized slot configuration with owner, fallback, nested slot routes, and
 * disabled state resolved from the authored route tree.
 */
export interface NormalizedRouteSlotConfig {
  readonly ownerRouteId: string;
  readonly name: string;
  readonly fallback?: NormalizedRouteSlotFallback | null;
  readonly routes: readonly NormalizedRoute[];
  readonly meta?: RouteMeta;
  readonly disabled: boolean;
}

/**
 * Normalized layout slots keyed by slot name.
 */
export type NormalizedRouteSlots = Readonly<Record<string, NormalizedRouteSlotConfig>>;

/**
 * Normalized layout shell data used by render integrations.
 */
export interface NormalizedRouteLayout {
  readonly component?: RouteComponent;
  readonly slots?: NormalizedRouteSlots;
}

/**
 * Normalized route-configured intercept from a source route to a target route.
 */
export interface NormalizedIntercept {
  readonly sourceRouteId: string;
  readonly slot: string;
  readonly targetRouteId: string;
  readonly component: RouteComponent;
}

/**
 * Internal normalized route used for ranking, matching, rendering, slots, and
 * diagnostics.
 *
 * Prefer `RouteDefinition` for authored config and `RouteMatch` for public match
 * state. This shape includes derived data such as full paths, scores, order, slot
 * ownership, params, and normalized intercepts.
 */
export interface NormalizedRoute {
  readonly id: string;
  readonly localPath?: string;
  readonly fullPath?: string;
  readonly parentId?: string;
  readonly children: readonly NormalizedRoute[];
  readonly layout?: NormalizedRouteLayout;
  readonly component?: RouteComponent;
  readonly params: readonly RouteParamDefinition[];
  readonly index: boolean;
  readonly score: number;
  readonly order: number;
  readonly route: RouteDefinition;
  readonly meta?: RouteMeta;
  readonly lifecycle?: RouteLifecycle;
  readonly middleware?: readonly Middleware[];
  readonly slotOwnerId?: string;
  readonly slotName?: string;
  readonly slotRoute: boolean;
  readonly intercepts: readonly NormalizedIntercept[];
}

/**
 * Normalized route with its final route matching rank.
 */
export interface RankedRoute extends NormalizedRoute {
  readonly rank: number;
}

/**
 * One route entry in a matched branch.
 *
 * `params` are raw string values parsed from the URL for that branch entry. Use
 * `RouteMatch.params` when you need the merged, generated contract-aware params.
 */
export interface MatchedRoute {
  readonly id: string;
  readonly route: NormalizedRoute;
  readonly params: Record<string, string>;
}

/**
 * Runtime state for a slot after resolving the active location.
 */
export type ResolvedSlotStatus = 'matched' | 'fallback' | 'empty' | 'disabled' | 'not-found';

/**
 * Runtime resolution for one named slot.
 *
 * A slot can render a matched slot route, fallback content, an empty state, a
 * disabled state, or a not-found state when slot routing misses.
 */
export interface ResolvedSlot {
  readonly ownerRouteId: string;
  readonly name: string;
  readonly status: ResolvedSlotStatus;
  readonly config: NormalizedRouteSlotConfig;
  readonly match?: MatchedRoute;
  readonly branch?: readonly MatchedRoute[];
  readonly fallback?: NormalizedRouteSlotFallback;
  readonly params: Record<string, string>;
  readonly meta?: RouteMeta;
  readonly component?: RouteComponent;
}

/**
 * Resolved slots grouped first by owner route id, then by slot name.
 */
export type ResolvedSlots = Readonly<Record<string, Readonly<Record<string, ResolvedSlot>>>>;

/**
 * Parsed query-string values when no generated search contract is available.
 */
export type ParsedRouteSearch = Record<string, string | readonly string[]>;

/**
 * Public matched route state for the current or requested location.
 *
 * When generated contracts are registered, `params`, `search`, and `hash` are
 * narrowed for the matched route id. `branch` keeps the raw matched route entries
 * and raw string params for each level.
 */
export interface RouteMatch<Route extends string = string> {
  readonly id: Route;
  readonly pathname: string;
  readonly search: Route extends RouteId ? RouteSearch<Route> : ParsedRouteSearch;
  readonly hash: Route extends RouteId ? RouteHashInput<Route> : string;
  readonly href: string;
  readonly route: NormalizedRoute;
  readonly branch: readonly MatchedRoute[];
  readonly params: (Route extends RouteId ? RouteParams<Route> : Record<string, unknown>) &
    Record<string, string>;
  readonly slots: ResolvedSlots;
  readonly intercepted?: ResolvedInterceptedRoute;
}

/**
 * Route match narrowed to the generated route id union when module augmentation
 * has registered contracts.
 */
export type RegisteredRouteMatch = RouteId extends string
  ? RouteMatch<RouteId>
  : RouteMatch<string>;

/**
 * Active intercepted route rendered into a slot while the source branch remains
 * mounted.
 */
export interface ResolvedInterceptedRoute {
  readonly slot: string;
  readonly sourceRouteId: string;
  readonly targetRouteId: string;
  readonly previousHref: string;
  readonly match: RouteMatch;
  readonly component: RouteComponent;
  readonly context?: unknown;
}

/**
 * Context passed to route and runtime middleware during navigation.
 *
 * Helpers return structured middleware results so middleware can redirect,
 * rewrite, or cancel without constructing those objects manually.
 */
export interface MiddlewareContext {
  readonly route: MatchedRoute;
  readonly location: RouterLocation;
  readonly params: Record<string, string>;
  redirect: (to: string) => MiddlewareResult;
  rewrite: (to: string) => MiddlewareResult;
  cancel: () => MiddlewareResult;
}

/**
 * Supported middleware outcomes.
 *
 * `void` continues navigation, `false` or `{ type: 'cancel' }` blocks it,
 * redirect changes the browser location, rewrite resolves another route without
 * exposing the intermediate href, and `Response` is surfaced as navigation error
 * state for integrations that model loader responses.
 */
export type MiddlewareResult =
  | void
  | false
  | Response
  | {
      readonly type: 'redirect';
      readonly to: string;
    }
  | {
      readonly type: 'rewrite';
      readonly to: string;
    }
  | {
      readonly type: 'cancel';
    };

/**
 * Middleware function run during navigation after blockers and before lifecycle
 * completion.
 */
export type Middleware = (
  context: MiddlewareContext,
) => MiddlewareResult | Promise<MiddlewareResult>;

/**
 * Context shared by route and global lifecycle hooks.
 */
export interface RouteLifecycleContext {
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}

/**
 * Route-local lifecycle hooks.
 *
 * `beforeEnter` and `beforeLeave` can cancel navigation by returning `false`.
 * Errors thrown by hooks are routed to `onError` and navigation error state.
 */
export interface RouteLifecycle {
  readonly beforeEnter?: (
    context: RouteLifecycleContext,
  ) => boolean | void | Promise<boolean | void>;
  readonly afterEnter?: (context: RouteLifecycleContext) => void | Promise<void>;
  readonly beforeLeave?: (
    context: RouteLifecycleContext,
  ) => boolean | void | Promise<boolean | void>;
  readonly onError?: (error: unknown, context: RouteLifecycleContext) => void | Promise<void>;
}

/**
 * Router-wide lifecycle hooks that wrap route transitions.
 *
 * Global hooks are useful for analytics, logging, or shared guards that should
 * not be duplicated on individual route definitions.
 */
export interface GlobalLifecycle {
  readonly beforeNavigate?: (
    context: RouteLifecycleContext,
  ) => boolean | void | Promise<boolean | void>;
  readonly afterNavigate?: (context: RouteLifecycleContext) => void | Promise<void>;
  readonly onNavigationError?: (
    error: unknown,
    context: RouteLifecycleContext,
  ) => void | Promise<void>;
}
