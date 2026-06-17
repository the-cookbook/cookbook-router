import type { RouterHistory, RouterLocation } from '../history/memory-history';
import type { RouterPathConstraints } from '../path/constraints';
import type { RouterPathOptions } from '../path/options';
import type {
  GlobalLifecycle,
  Middleware,
  NormalizedRoute,
  RankedRoute,
  RegisteredRouteMatch,
  RouteDefinition,
  RouteMatch,
} from '../route-config/contracts';
import type { InterceptInput } from '../rendering/resolve-intercepts';
import type { RouterNavigationState } from '../transition/run-transition';
import type { RouteId, RouteUrlOptions } from '../contracts';
import type { RouterUrlBuildOptions, RouterUrlOptions } from '../url-state/contracts';

/**
 * Options for creating a router runtime.
 *
 * Routes are validated and normalized immediately. `defineRoutes` options such
 * as custom path constraints are respected before path validation. Hydration
 * data must describe the same pathname and search string as the active history
 * location. Hash fragments are client-only and may differ during browser SSR
 * hydration because fragments are not sent in HTTP requests.
 */
export interface CreateRouterOptions {
  readonly routes: readonly RouteDefinition[];
  readonly basename?: string;
  readonly middleware?: readonly Middleware[];
  readonly lifecycle?: GlobalLifecycle;
  readonly hydrationData?: SerializedRouterState;
  readonly history?: RouterHistory;
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  /** Router-level URLKit defaults used by URL contract parsing and building. */
  readonly url?: RouterUrlOptions;
  readonly maxRedirectDepth?: number;
  readonly maxRedirectionDepth?: number;
}

/**
 * Options used when generating an href or navigating to a route id.
 *
 * `intercept` explicitly requests, disambiguates, or disables a slot intercept.
 * Configured route intercepts are automatic when the active source route declares
 * them unless `intercept: false` is passed. `context` is carried to intercepted
 * rendering state.
 */
export interface HrefOptions<Route extends string> extends RouteUrlOptions<Route> {
  /** Per-call URLKit build options that override route-level and router-level defaults. */
  readonly url?: RouterUrlBuildOptions;
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly preventScrollReset?: boolean;
}

/** Options used when preloading a route target without committing navigation. */
export interface PreloadOptions<Route extends string> extends HrefOptions<Route> {
  readonly signal?: AbortSignal;
}

/** Options used when preloading an arbitrary href. */
export interface PreloadHrefOptions extends MatchOptions {
  readonly signal?: AbortSignal;
}

/** App-internal href accepted by navigation methods after route matching. */
export type InternalHref = `/${string}`;

/** Options that affect navigation behavior without rebuilding the href. */
export interface NavigationOptions {
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly preventScrollReset?: boolean;
}

/**
 * Object-form navigation target used by href, resolve, and navigate methods.
 */
export interface NavigateOptions<Route extends string> extends HrefOptions<Route> {
  readonly route: Route;
}

/** Options used when matching an arbitrary href. */
export interface MatchOptions {
  /** Per-call URLKit options used while parsing search arrays and route URL state. */
  readonly url?: RouterUrlOptions;
}

/**
 * Context passed to navigation blockers before middleware and lifecycle hooks run.
 */
export interface RouterBlockerContext {
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}

/**
 * Function that can cancel a navigation.
 *
 * Return `false` to block the transition. Throwing places the router in error
 * state for the attempted location.
 */
export type RouterBlocker = (
  context: RouterBlockerContext,
) => boolean | void | Promise<boolean | void>;

/**
 * Current router state exposed through subscriptions and React hooks.
 */
export interface RouterState {
  readonly location: RouterLocation;
  readonly match: RouteMatch | null;
  readonly navigation: RouterNavigationState;
  readonly error?: unknown;
  readonly previousLocation?: RouterLocation;
}

/**
 * Minimal serializable state used for SSR hydration.
 *
 * The serialized location must match the client history pathname and search
 * string when a browser router is created with `hydrationData`. Hash fragments
 * are client-only and may differ on direct SSR entries.
 */
export interface SerializedRouterState {
  readonly location: RouterLocation;
  readonly navigation: RouterNavigationState;
}

/**
 * Router runtime returned by `createRouter`, `createMemoryRouter`, and
 * `createStaticRouter`.
 *
 * The runtime owns normalized routes, current match state, navigation, blockers,
 * middleware, and serialization. All route-id APIs use generated contracts when
 * module augmentation has registered them.
 */
export interface Router {
  /** Normalized route tree derived from the authored definitions. */
  readonly routes: readonly NormalizedRoute[];
  /** Flattened route list ordered for deterministic matching. */
  readonly rankedRoutes: readonly RankedRoute[];
  /** Latest router state snapshot. Subscribe to receive updates. */
  readonly state: RouterState;
  /** Whether `start()` has resolved the router at least once. */
  readonly started: boolean;
  /** Whether the router is currently resolving its initial startup. */
  readonly starting: boolean;
  /** Whether this router has been disposed and will no longer process transitions. */
  readonly disposed: boolean;
  /**
   * Generates a URL for a route id without navigating.
   *
   * Required params and invalid path constraints throw during href generation so
   * broken links fail before navigation.
   */
  href<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): string;
  href<Route extends string>(routeId: Route, options?: HrefOptions<Route>): string;
  href<Route extends RouteId>(options: NavigateOptions<Route>): string;
  href<Route extends string>(options: NavigateOptions<Route>): string;
  /** Resolves a route id into URLKit-parsed match state without changing history. */
  resolve<Route extends RouteId>(
    routeId: Route,
    options?: HrefOptions<Route>,
  ): RegisteredRouteMatch;
  resolve<Route extends string>(routeId: Route, options?: HrefOptions<Route>): RegisteredRouteMatch;
  resolve<Route extends RouteId>(options: NavigateOptions<Route>): RegisteredRouteMatch;
  resolve<Route extends string>(options: NavigateOptions<Route>): RegisteredRouteMatch;
  /** Matches an arbitrary href against the ranked routes and returns URLKit-parsed match state. */
  match(href: string, options?: MatchOptions): RegisteredRouteMatch | null;
  /** Preloads route modules, lazy route views, and route-level preload hooks. */
  preload<Route extends RouteId>(routeId: Route, options?: PreloadOptions<Route>): Promise<void>;
  preload<Route extends string>(routeId: Route, options?: PreloadOptions<Route>): Promise<void>;
  preload<Route extends RouteId>(
    options: NavigateOptions<Route> & { readonly signal?: AbortSignal },
  ): Promise<void>;
  preload<Route extends string>(
    options: NavigateOptions<Route> & { readonly signal?: AbortSignal },
  ): Promise<void>;
  /** Preloads an arbitrary app href without committing navigation. */
  preloadHref(href: string, options?: PreloadHrefOptions): Promise<void>;
  /** Programmatic navigation methods. */
  navigate: {
    /** Pushes a new history entry and resolves the transition. */
    to(href: InternalHref, options?: NavigationOptions): Promise<RouterState>;
    to<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): Promise<RouterState>;
    to<Route extends string>(routeId: Route, options?: HrefOptions<Route>): Promise<RouterState>;
    to<Route extends RouteId>(options: NavigateOptions<Route>): Promise<RouterState>;
    to<Route extends string>(options: NavigateOptions<Route>): Promise<RouterState>;
    /** Replaces the current history entry and resolves the transition. */
    replace(href: InternalHref, options?: NavigationOptions): Promise<RouterState>;
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
    /** Delegates to the history back operation. */
    back: () => void;
    /** Delegates to the history forward operation. */
    forward: () => void;
    /** Moves through history by `delta` entries. */
    go: (delta: number) => void;
  };
  /** Subscribes to state changes and returns an unsubscribe function. */
  subscribe(listener: (state: RouterState) => void): () => void;
  /** Registers a navigation blocker and returns a cleanup function. */
  block(blocker: RouterBlocker): () => void;
  /** Adds runtime middleware for as long as the returned cleanup is retained. */
  useMiddleware(middleware: readonly Middleware[]): () => void;
  /**
   * Starts the router by resolving the current history or static location.
   *
   * Concurrent calls share the same in-flight startup. Once started, calling
   * `start()` again returns the current state without re-running navigation work.
   */
  start(): Promise<RouterState>;
  /**
   * Re-resolves the current history or static location without pushing history.
   *
   * Use this to retry the current route, recover from browser-only hash hydration,
   * or explicitly re-run current-location middleware and lifecycle hooks.
   */
  refresh(): Promise<RouterState>;
  /** Returns hydration-safe state for SSR serialization. */
  serialize(): SerializedRouterState;
  /**
   * Disposes the router runtime.
   *
   * Removes the history listener, clears runtime middleware/blockers/subscribers,
   * and prevents future navigation/start/refresh/preload work.
   */
  dispose(): void;
}
