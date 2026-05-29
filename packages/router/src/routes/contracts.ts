import type { RouterLocation } from '../history/memory-history';
import type { RouterPathOptions } from '../pathkit/pathkit';
import type { RouteHashInput, RouteId, RouteParams, RouteSearch } from '../contracts';

export type RouteComponent = unknown;
export type RouteMeta = Record<string, unknown>;
export type RouteSearchValueType = 'one' | 'many';

export interface RouteSearchValueSchema {
  readonly type: RouteSearchValueType;
  readonly optional?: boolean;
}

export type RouteSearchSchema = Readonly<Record<string, RouteSearchValueSchema>>;
export type { RouterPathOptions };

export type RouteInterceptTarget = string | readonly string[];

export interface RouteInterceptConfig {
  readonly to: RouteInterceptTarget;
  readonly component: RouteComponent;
}

export type RouteIntercepts = Readonly<Record<string, RouteInterceptConfig>>;

export type RouteRedirect =
  | string
  | {
      readonly route: string;
      readonly params?: Record<string, unknown>;
      readonly search?: Record<string, unknown>;
      readonly hash?: string | null;
    };

export interface RouteSlotConfig {
  readonly component?: RouteComponent;
  readonly routes?: readonly RouteDefinition[];
  readonly meta?: RouteMeta;
}

export type RouteSlotDefinition = RouteComponent | RouteSlotConfig | true;
export type RouteSlotDefinitions = Readonly<Record<string, RouteSlotDefinition>>;

export interface RouteLayoutDefinition {
  readonly component?: RouteComponent;
  readonly loading?: RouteComponent;
  readonly error?: RouteComponent;
  readonly slots?: RouteSlotDefinitions;
}

export interface RouteDefinition {
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
  readonly error?: RouteComponent;
  readonly lifecycle?: RouteLifecycle;
  readonly middleware?: readonly Middleware[];
}

export type RouteParamConstraint = string;

export interface RouteParamDefinition {
  readonly name: string;
  readonly constraint: RouteParamConstraint;
  readonly token: string;
}

export interface NormalizedRouteSlotFallback {
  readonly ownerRouteId: string;
  readonly slotName: string;
  readonly component: RouteComponent;
  readonly meta?: RouteMeta;
}

export interface NormalizedRouteSlotConfig {
  readonly ownerRouteId: string;
  readonly name: string;
  readonly fallback?: NormalizedRouteSlotFallback | null;
  readonly routes: readonly NormalizedRoute[];
  readonly meta?: RouteMeta;
  readonly disabled: boolean;
}

export type NormalizedRouteSlots = Readonly<Record<string, NormalizedRouteSlotConfig>>;

export interface NormalizedRouteLayout {
  readonly component?: RouteComponent;
  readonly slots?: NormalizedRouteSlots;
}

export interface NormalizedIntercept {
  readonly sourceRouteId: string;
  readonly slot: string;
  readonly targetRouteId: string;
  readonly component: RouteComponent;
}

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

export interface RankedRoute extends NormalizedRoute {
  readonly rank: number;
}

export interface MatchedRoute {
  readonly id: string;
  readonly route: NormalizedRoute;
  readonly params: Record<string, string>;
}

export type ResolvedSlotStatus = 'matched' | 'fallback' | 'empty' | 'disabled' | 'not-found';

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

export type ResolvedSlots = Readonly<Record<string, Readonly<Record<string, ResolvedSlot>>>>;

export type ParsedRouteSearch = Record<string, string | readonly string[]>;

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

export type RegisteredRouteMatch = RouteId extends string
  ? RouteMatch<RouteId>
  : RouteMatch<string>;

export interface ResolvedInterceptedRoute {
  readonly slot: string;
  readonly sourceRouteId: string;
  readonly targetRouteId: string;
  readonly previousHref: string;
  readonly match: RouteMatch;
  readonly component: RouteComponent;
  readonly context?: unknown;
}

export interface MiddlewareContext {
  readonly route: MatchedRoute;
  readonly location: RouterLocation;
  readonly params: Record<string, string>;
  redirect: (to: string) => MiddlewareResult;
  rewrite: (to: string) => MiddlewareResult;
  cancel: () => MiddlewareResult;
}

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

export type Middleware = (
  context: MiddlewareContext,
) => MiddlewareResult | Promise<MiddlewareResult>;

export interface RouteLifecycleContext {
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}

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
