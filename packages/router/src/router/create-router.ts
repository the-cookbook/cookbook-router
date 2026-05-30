import { createBrowserHistory } from '../history/browser-history';
import {
  createMemoryHistory,
  parseHref,
  type RouterHistory,
  type RouterLocation,
} from '../history/memory-history';
import { matchRoutes } from '../matching/match-routes';
import { normalizeRoutes } from '../matching/normalize-routes';
import { rankRoutes } from '../matching/rank-routes';
import {
  compilePathPattern,
  matchPathPattern,
  normalizePathOptions,
  prunePathname,
  registerPathConstraints,
  type PathkitCompileParams,
  type RouterPathOptions,
} from '../pathkit/pathkit';
import { validateRoutes } from '../validation/validate-routes';
import {
  createInterceptHistoryState,
  resolveIntercept,
  restoreInterceptFromState,
  validateInterceptTargets,
  type InterceptInput,
  type ResolvedIntercept,
} from '../resolution/resolve-intercepts';
import {
  completeTransition,
  runTransition,
  type RouterNavigationState,
} from '../navigation/transition';
import type {
  GlobalLifecycle,
  Middleware,
  NormalizedRoute,
  RankedRoute,
  ResolvedInterceptedRoute,
  RouteDefinition,
  RegisteredRouteMatch,
  RouteMatch,
  RouteRedirect,
} from '../routes/contracts';
import type { RouteId, RouteUrlOptions } from '../contracts';
import { getDefineRoutesOptions } from '../routes/define-routes';
import {
  createGeneratedHrefMismatchError,
  createHydrationMismatchError,
  createInvalidParamError,
  createMissingParamError,
  createMissingPathError,
  createUnknownRouteError,
} from '../diagnostics/router-errors';
import {
  assertSerializedRouterState,
  parseSerializedRouterState,
  stringifySerializedRouterState,
} from '../security/serialized-state';

/**
 * Options for creating a router runtime.
 *
 * Routes are validated and normalized immediately. `defineRoutes` options such
 * as custom path constraints are respected before path validation. Hydration
 * data must describe the same href as the active history location.
 */
export interface CreateRouterOptions {
  readonly routes: readonly RouteDefinition[];
  readonly basename?: string;
  readonly middleware?: readonly Middleware[];
  readonly lifecycle?: GlobalLifecycle;
  readonly hydrationData?: SerializedRouterState;
  readonly history?: RouterHistory;
  readonly pathOptions?: RouterPathOptions;
  readonly maxRedirectDepth?: number;
  readonly maxRedirectionDepth?: number;
}

/**
 * Options used when generating an href or navigating to a route id.
 *
 * `intercept` explicitly requests or disambiguates a slot intercept. Configured
 * route intercepts are still automatic when the active source route declares
 * them. `context` is carried to intercepted rendering state.
 */
export interface HrefOptions<Route extends string> extends RouteUrlOptions<Route> {
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
 * The serialized location must match the client history location when a browser
 * router is created with `hydrationData`.
 */
export interface SerializedRouterState {
  readonly location: RouterLocation;
  readonly navigation: RouterNavigationState;
}

interface ScrollHistoryState {
  readonly __cookbookRouterScroll?: {
    readonly preventReset?: boolean;
  };
}

interface ActiveNavigation {
  readonly href: string;
  readonly mode: 'push' | 'replace';
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly preventScrollReset?: boolean;
  readonly promise: Promise<RouterState>;
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
  /** Resolves a route id into a parsed location without changing history. */
  resolve<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): RouterLocation;
  resolve<Route extends string>(routeId: Route, options?: HrefOptions<Route>): RouterLocation;
  resolve<Route extends RouteId>(options: NavigateOptions<Route>): RouterLocation;
  resolve<Route extends string>(options: NavigateOptions<Route>): RouterLocation;
  /** Matches an arbitrary href against the ranked routes and returns match state. */
  match(href: string): RegisteredRouteMatch | null;
  /** Programmatic navigation methods. */
  navigate: {
    /** Pushes a new history entry and resolves the transition. */
    to<Route extends RouteId>(routeId: Route, options?: HrefOptions<Route>): Promise<RouterState>;
    to<Route extends string>(routeId: Route, options?: HrefOptions<Route>): Promise<RouterState>;
    to<Route extends RouteId>(options: NavigateOptions<Route>): Promise<RouterState>;
    to<Route extends string>(options: NavigateOptions<Route>): Promise<RouterState>;
    /** Replaces the current history entry and resolves the transition. */
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
  /** Resolves the current history location; useful for bootstrapping direct entry. */
  resolveCurrent(): Promise<RouterState>;
  /** Returns hydration-safe state for SSR serialization. */
  serialize(): SerializedRouterState;
}

/**
 * Creates a browser router by default, or uses the supplied history implementation.
 *
 * Use this in browser applications. For tests and SSR prefer the dedicated
 * memory/static helpers.
 */
export function createRouter(options: CreateRouterOptions): Router {
  const history = options.history ?? createDefaultHistory(options.hydrationData?.location.href);
  return createRouterRuntime({ ...options, history });
}

/**
 * Creates a router from an explicit history implementation.
 *
 * This lower-level helper is mainly useful for custom histories and tests.
 */

export function createRouterRuntime(
  options: Required<Pick<CreateRouterOptions, 'history'>> & CreateRouterOptions,
): Router {
  const definedRouteOptions = getDefineRoutesOptions(options.routes);
  registerPathConstraints(definedRouteOptions?.pathConstraints);
  const pathOptions = normalizePathOptions(options.pathOptions ?? definedRouteOptions?.pathOptions);
  const maxRedirectDepth = normalizeMaxRedirectDepth(options);
  validateRoutes(options.routes, pathOptions);
  const normalizedRoutes = normalizeRoutes(options.routes, pathOptions);
  validateInterceptTargets(normalizedRoutes);
  const rankedRoutes = rankRoutes(normalizedRoutes);
  const routeLookup = createRouteLookup(normalizedRoutes);
  const compileCachedRoutePath = createRoutePathCompiler(pathOptions);
  const listeners = new Set<(state: RouterState) => void>();
  const blockers = new Set<RouterBlocker>();
  const runtimeMiddleware = new Set<Middleware>();
  let transitionVersion = 0;
  let activeNavigation: ActiveNavigation | undefined;
  let state: RouterState = createState(options.history.location, 'idle');

  const router: Router = {
    routes: normalizedRoutes,
    rankedRoutes,
    get state() {
      return state;
    },
    href(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
      const target = normalizeNavigateTarget(
        routeOrOptions as string | NavigateOptions<string>,
        hrefOptions as HrefOptions<string> | undefined,
      );
      return createHref(
        target.route,
        target.options,
        routeLookup,
        compileCachedRoutePath,
        options.basename,
        pathOptions,
      );
    },
    resolve(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
      const target = normalizeNavigateTarget(
        routeOrOptions as string | NavigateOptions<string>,
        hrefOptions as HrefOptions<string> | undefined,
      );
      return parseHref(router.href(target.route, target.options));
    },
    match(href) {
      return matchHref(href) as RegisteredRouteMatch | null;
    },
    navigate: {
      to(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
        const target = normalizeNavigateTarget(
          routeOrOptions as string | NavigateOptions<string>,
          hrefOptions as HrefOptions<string> | undefined,
        );
        return navigateTo(
          router.href(target.route, target.options),
          'push',
          target.options?.intercept,
          target.options?.context,
          target.options?.preventScrollReset,
        );
      },
      replace(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
        const target = normalizeNavigateTarget(
          routeOrOptions as string | NavigateOptions<string>,
          hrefOptions as HrefOptions<string> | undefined,
        );
        return navigateTo(
          router.href(target.route, target.options),
          'replace',
          target.options?.intercept,
          target.options?.context,
          target.options?.preventScrollReset,
        );
      },
      back() {
        options.history.back();
      },
      forward() {
        options.history.forward();
      },
      go(delta) {
        options.history.go(delta);
      },
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    block(blocker) {
      blockers.add(blocker);
      return () => blockers.delete(blocker);
    },
    useMiddleware(middleware) {
      for (const entry of middleware) {
        runtimeMiddleware.add(entry);
      }

      return () => {
        for (const entry of middleware) {
          runtimeMiddleware.delete(entry);
        }
      };
    },
    resolveCurrent() {
      return transitionTo(options.history.location, 'replace', false);
    },
    serialize() {
      return {
        location: state.location,
        navigation: state.navigation,
      };
    },
  };

  let ignoreNextHistoryEvent = false;

  options.history.listen((event) => {
    if (ignoreNextHistoryEvent) {
      ignoreNextHistoryEvent = false;
      return;
    }

    void transitionTo(event.location, event.action === 'replace' ? 'replace' : 'push', false);
  });

  if (options.hydrationData) {
    const hydrationError =
      options.history.location.href === options.hydrationData.location.href
        ? undefined
        : createHydrationMismatchError(
            options.hydrationData.location.href,
            options.history.location.href,
          );

    state = {
      location: options.hydrationData.location,
      match: router.match(options.hydrationData.location.href),
      navigation: options.hydrationData.navigation,
      ...(hydrationError === undefined ? {} : { error: hydrationError }),
    };
  }

  function matchHref(href: string): RouteMatch | null {
    const location = parseHref(href);
    const match = matchRoutes(
      normalizedRoutes,
      stripBasename(location.pathname, options.basename),
      pathOptions,
    );

    if (!match) {
      return null;
    }

    return {
      ...match,
      search: parseSearch(location.search),
      hash: location.hash,
      href: location.href,
    };
  }

  function createState(
    location: RouterLocation,
    navigation: RouterNavigationState,
    error?: unknown,
    intercepted?: ResolvedInterceptedRoute,
    previousLocation?: RouterLocation,
  ): RouterState {
    const baseMatch = matchHref(location.href);
    const match = intercepted && baseMatch ? { ...baseMatch, intercepted } : baseMatch;
    const next: RouterState = {
      location,
      match,
      navigation,
      ...(previousLocation === undefined ? {} : { previousLocation }),
    };

    if (error !== undefined) {
      return { ...next, error };
    }

    return next;
  }

  function setState(nextState: RouterState): RouterState {
    state = nextState;

    for (const listener of listeners) {
      listener(state);
    }

    return state;
  }

  function navigateTo(
    href: string,
    mode: 'push' | 'replace',
    intercept?: InterceptInput,
    context?: unknown,
    preventScrollReset?: boolean,
  ): Promise<RouterState> {
    if (
      activeNavigation &&
      activeNavigation.href === href &&
      activeNavigation.mode === mode &&
      activeNavigation.intercept === intercept &&
      activeNavigation.context === context &&
      activeNavigation.preventScrollReset === preventScrollReset
    ) {
      return activeNavigation.promise;
    }

    const navigationState = createScrollHistoryState(undefined, preventScrollReset);
    const location = parseHref(
      href,
      navigationState === undefined ? {} : { state: navigationState },
    );
    const promise = transitionTo(location, mode, true, 0, intercept, context, preventScrollReset);
    const navigation: ActiveNavigation = {
      href,
      mode,
      promise,
      ...(intercept === undefined ? {} : { intercept }),
      ...(context === undefined ? {} : { context }),
      ...(preventScrollReset === undefined ? {} : { preventScrollReset }),
    };
    activeNavigation = navigation;

    void promise.finally(() => {
      if (activeNavigation === navigation) {
        activeNavigation = undefined;
      }
    });

    return promise;
  }

  async function transitionTo(
    location: RouterLocation,
    mode: 'push' | 'replace',
    writeHistory: boolean,
    redirectDepth = 0,
    interceptInput?: InterceptInput,
    context?: unknown,
    preventScrollReset?: boolean,
  ): Promise<RouterState> {
    const currentTransitionVersion = ++transitionVersion;

    if (redirectDepth > maxRedirectDepth) {
      return setState(
        createState(
          location,
          'error',
          new Error('Navigation exceeded the maximum redirect count.'),
        ),
      );
    }

    const fromMatch = state.match;
    const canonicalized = canonicalizeLocation(location);
    const transitionLocation = canonicalized.location;
    const nextMatch = canonicalized.match;
    const routeRedirect = resolveMatchedRouteRedirect(nextMatch);

    if (routeRedirect) {
      const redirectHref = createRouteRedirectHref(
        routeRedirect,
        routeLookup,
        compileCachedRoutePath,
        options.basename,
        pathOptions,
      );

      if (isExternalHref(redirectHref)) {
        if (!options.history.redirectExternal) {
          return setState(
            createState(
              transitionLocation,
              'error',
              new Error(
                `History implementation cannot redirect to external URL "${redirectHref}".`,
              ),
            ),
          );
        }

        options.history.redirectExternal(redirectHref, 'replace');
        return setState({ ...state, navigation: 'redirecting' });
      }

      setState({ ...state, navigation: 'redirecting' });
      const redirectLocation = parseHref(redirectHref);
      const shouldWriteRedirectHistory =
        options.history.mode !== 'static' &&
        (writeHistory || location.href === options.history.location.href);
      return transitionTo(
        redirectLocation,
        'replace',
        shouldWriteRedirectHistory,
        redirectDepth + 1,
        undefined,
        undefined,
        preventScrollReset,
      );
    }

    if (canonicalized.replaced) {
      ignoreNextHistoryEvent = true;
      options.history.replace(transitionLocation.href, transitionLocation.state);
    }

    const activeSource = resolveActiveInterceptSource(
      fromMatch,
      interceptInput,
      normalizedRoutes,
      options.basename,
      pathOptions,
    );
    const restoredSource = restorePreviousSource(
      transitionLocation.state,
      normalizedRoutes,
      options.basename,
      pathOptions,
    );
    const restoredIntercept = restoreInterceptFromState(
      transitionLocation.state,
      restoredSource,
      nextMatch,
      pathOptions,
    );
    const navigationIntercept = writeHistory
      ? resolveNavigationIntercept({
          source: activeSource,
          destination: nextMatch,
          location: transitionLocation,
          basename: options.basename,
          previousHref: fromMatch?.intercepted?.previousHref ?? state.location.href,
          ...(interceptInput === undefined ? {} : { intercept: interceptInput }),
          ...(context === undefined ? {} : { context }),
          production: isProduction(),
          pathOptions,
        })
      : restoredIntercept;
    const previousLocation = navigationIntercept
      ? parseHref(navigationIntercept.previousLocation)
      : undefined;

    try {
      if (await isBlocked(fromMatch, nextMatch, transitionLocation)) {
        if (!writeHistory && options.history.mode !== 'static') {
          ignoreNextHistoryEvent = true;
          options.history.replace(state.location.href, state.location.state);
        }

        return setState({ ...state, navigation: 'blocked' });
      }
    } catch (error) {
      return setState(createState(transitionLocation, 'error', error));
    }

    setState({ ...state, navigation: 'pending' });

    const result = await runTransition({
      from: fromMatch,
      to: nextMatch,
      location: transitionLocation,
      middleware: getActiveMiddleware(),
      ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
    });

    if (currentTransitionVersion !== transitionVersion) {
      return state;
    }

    if (result instanceof Response) {
      return setState(createState(transitionLocation, 'error', result));
    }

    if (result.type === 'blocked') {
      return setState({ ...state, navigation: 'blocked' });
    }

    if (result.type === 'redirect') {
      setState({ ...state, navigation: 'redirecting' });

      if (isExternalHref(result.to)) {
        if (!options.history.redirectExternal) {
          return setState(
            createState(
              transitionLocation,
              'error',
              new Error(`History implementation cannot redirect to external URL "${result.to}".`),
            ),
          );
        }

        options.history.redirectExternal(result.to, 'replace');
        return state;
      }

      const redirectLocation = parseHref(result.to);
      const shouldWriteRedirectHistory =
        options.history.mode !== 'static' &&
        (writeHistory || location.href === options.history.location.href);
      return transitionTo(
        redirectLocation,
        'replace',
        shouldWriteRedirectHistory,
        redirectDepth + 1,
        undefined,
        undefined,
        preventScrollReset,
      );
    }

    if (result.type === 'rewrite') {
      setState({ ...state, navigation: 'redirecting' });

      if (isExternalHref(result.to)) {
        return setState(
          createState(
            transitionLocation,
            'error',
            new Error(`Middleware cannot rewrite to external URL "${result.to}".`),
          ),
        );
      }

      return transitionTo(
        parseHref(result.to),
        'replace',
        false,
        redirectDepth + 1,
        undefined,
        undefined,
        preventScrollReset,
      );
    }

    if (result.type === 'error') {
      return setState(createState(transitionLocation, 'error', result.error));
    }

    if (writeHistory) {
      ignoreNextHistoryEvent = true;

      const historyState = navigationIntercept
        ? createScrollHistoryState(
            createInterceptHistoryState(navigationIntercept, navigationIntercept.previousLocation),
            preventScrollReset,
          )
        : createScrollHistoryState(transitionLocation.state, preventScrollReset);

      if (mode === 'replace') {
        options.history.replace(transitionLocation.href, historyState);
      } else {
        options.history.push(transitionLocation.href, historyState);
      }
    }

    const intercepted = navigationIntercept
      ? createInterceptedRoute(navigationIntercept, nextMatch)
      : undefined;
    const committed = setState(
      createState(transitionLocation, 'idle', undefined, intercepted, previousLocation),
    );
    try {
      await completeTransition({
        from: fromMatch,
        to: nextMatch,
        location: transitionLocation,
        middleware: getActiveMiddleware(),
        ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
      });
    } catch (error) {
      return setState(
        createState(transitionLocation, 'error', error, intercepted, previousLocation),
      );
    }

    return committed;
  }

  function getActiveMiddleware(): readonly Middleware[] {
    if (!runtimeMiddleware.size) {
      return options.middleware ?? [];
    }

    return [...(options.middleware ?? []), ...runtimeMiddleware];
  }

  async function isBlocked(
    from: RouteMatch | null,
    to: RouteMatch | null,
    location: RouterLocation,
  ): Promise<boolean> {
    for (const blocker of blockers) {
      const result = await blocker({ from, to, location });

      if (result === false) {
        return true;
      }
    }

    return false;
  }

  function canonicalizeLocation(location: RouterLocation): {
    readonly location: RouterLocation;
    readonly match: RouteMatch | null;
    readonly replaced: boolean;
  } {
    let nextLocation = location;
    let nextMatch = router.match(nextLocation.href);

    if (!nextMatch) {
      const prunedPathname = prunePathname(nextLocation.pathname, pathOptions);

      if (prunedPathname !== nextLocation.pathname) {
        const candidate = parseHref(`${prunedPathname}${nextLocation.search}${nextLocation.hash}`, {
          ...(nextLocation.state === undefined ? {} : { state: nextLocation.state }),
          key: nextLocation.key,
        });
        const candidateMatch = router.match(candidate.href);

        if (candidateMatch) {
          nextLocation = candidate;
          nextMatch = candidateMatch;
        }
      }
    }

    if (!nextMatch) {
      return { location: nextLocation, match: nextMatch, replaced: false };
    }

    const canonicalPathname = applyBasename(
      compileCachedRoutePath(nextMatch.route, nextMatch.params),
      options.basename,
    );
    const canonicalHref = `${canonicalPathname}${nextLocation.search}${nextLocation.hash}`;

    if (canonicalHref === nextLocation.href) {
      return { location: nextLocation, match: nextMatch, replaced: false };
    }

    const canonicalLocation = parseHref(canonicalHref, {
      ...(nextLocation.state === undefined ? {} : { state: nextLocation.state }),
      key: nextLocation.key,
    });

    return {
      location: canonicalLocation,
      match: router.match(canonicalLocation.href),
      replaced: options.history.mode !== 'static',
    };
  }

  return router;
}

function createScrollHistoryState(
  state: unknown,
  preventScrollReset: boolean | undefined,
): unknown {
  if (preventScrollReset !== true) {
    return state;
  }

  const scrollState: ScrollHistoryState['__cookbookRouterScroll'] = { preventReset: true };

  if (!state || typeof state !== 'object') {
    return { __cookbookRouterScroll: scrollState };
  }

  return {
    ...state,
    __cookbookRouterScroll: scrollState,
  };
}

function normalizeMaxRedirectDepth(options: CreateRouterOptions): number {
  const value = options.maxRedirectDepth ?? options.maxRedirectionDepth ?? 10;

  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Router maxRedirectDepth must be a non-negative integer.');
  }

  return value;
}

function resolveMatchedRouteRedirect(match: RouteMatch | null): RouteRedirect | undefined {
  if (!match) {
    return undefined;
  }

  for (let index = match.branch.length - 1; index >= 0; index -= 1) {
    const redirect = match.branch[index]?.route.route.redirect;

    if (redirect !== undefined) {
      return redirect;
    }
  }

  return match.route.route.redirect;
}

function createRouteRedirectHref(
  redirect: RouteRedirect,
  routes: ReadonlyMap<string, NormalizedRoute>,
  compileCachedRoutePath: (route: NormalizedRoute, params: unknown) => string,
  basename: string | undefined,
  pathOptions: RouterPathOptions,
): string {
  if (typeof redirect === 'string') {
    return redirect;
  }

  return createHref(
    redirect.route,
    {
      ...(redirect.params === undefined ? {} : { params: redirect.params }),
      ...(redirect.search === undefined ? {} : { search: redirect.search }),
      ...(redirect.hash === undefined ? {} : { hash: redirect.hash }),
    },
    routes,
    compileCachedRoutePath,
    basename,
    pathOptions,
  );
}

function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

/**
 * Extracts the router state needed to hydrate a matching client router.
 */
export function serializeRouterState(router: Pick<Router, 'serialize'>): SerializedRouterState {
  return assertSerializedRouterState(router.serialize());
}

/**
 * Serializes router hydration state to a JSON string with validation hardening.
 */
export function stringifyRouterState(router: Pick<Router, 'serialize'>): string {
  return stringifySerializedRouterState(router.serialize());
}

/**
 * Parses serialized hydration state and validates the expected router-state shape.
 */
export function deserializeRouterState(
  state: SerializedRouterState | string,
): SerializedRouterState {
  return typeof state === 'string'
    ? parseSerializedRouterState(state)
    : assertSerializedRouterState(state);
}

function normalizeNavigateTarget<Route extends string>(
  routeOrOptions: Route | NavigateOptions<Route>,
  options?: HrefOptions<Route>,
): { readonly route: Route; readonly options?: HrefOptions<Route> } {
  if (typeof routeOrOptions === 'object' && routeOrOptions !== null) {
    const { route, ...rest } = routeOrOptions;
    return { route, options: rest as HrefOptions<Route> };
  }

  return { route: routeOrOptions as Route, ...(options === undefined ? {} : { options }) };
}

function createDefaultHistory(initialHref?: string): RouterHistory {
  if (typeof globalThis.window === 'undefined') {
    return createMemoryHistory({ initialEntries: [initialHref ?? '/'] });
  }

  return createBrowserHistory();
}

function createHref<Route extends string>(
  routeId: Route,
  options: HrefOptions<Route> | undefined,
  routes: ReadonlyMap<string, NormalizedRoute>,
  compileCachedRoutePath: (route: NormalizedRoute, params: unknown) => string,
  basename: string | undefined,
  pathOptions: RouterPathOptions,
): string {
  const route = routes.get(routeId);

  if (!route) {
    throw createUnknownRouteError(routeId);
  }

  if (!route.fullPath) {
    throw createMissingPathError(routeId);
  }

  const pathname = applyBasename(compileCachedRoutePath(route, options?.params), basename);
  const search = serializeSearch(options?.search);
  const hash = serializeHash(options?.hash);
  const href = `${pathname}${search}${hash}`;

  if (!matchPathPattern(route.fullPath, stripBasename(pathname, basename), pathOptions)) {
    throw createGeneratedHrefMismatchError(routeId, href, route.fullPath);
  }

  return href;
}

function createRoutePathCompiler(
  pathOptions: RouterPathOptions,
): (route: NormalizedRoute, params: unknown) => string {
  const cache = new WeakMap<NormalizedRoute, Map<string, string>>();

  return (route, params) => {
    const values = asParamRecord(params);
    const key = createParamCacheKey(route, values);
    let routeCache = cache.get(route);

    if (!routeCache) {
      routeCache = new Map<string, string>();
      cache.set(route, routeCache);
    }

    const cached = routeCache.get(key);

    if (cached) {
      return cached;
    }

    const compiled = compileRoutePath(route, values, pathOptions);
    routeCache.set(key, compiled);
    return compiled;
  };
}

function createParamCacheKey(route: NormalizedRoute, params: Record<string, unknown>): string {
  if (!route.params.length) {
    return '';
  }

  return route.params.map((param) => `${param.name}:${String(params[param.name])}`).join('|');
}

function compileRoutePath(
  route: NormalizedRoute,
  params: unknown,
  pathOptions: RouterPathOptions,
): string {
  assertRequiredPathParams(route, params);

  try {
    return compilePathPattern(route.fullPath ?? '/', asPathkitParams(params), pathOptions);
  } catch (error) {
    throw mapPathkitCompileError(route, params, error);
  }
}

function assertRequiredPathParams(route: NormalizedRoute, params: unknown): void {
  const values = asParamRecord(params);

  for (const param of route.params) {
    const value = values[param.name];

    if (value === undefined || value === null || value === '') {
      throw createMissingParamError(route.id, param.name, param.token, value);
    }
  }
}

function asPathkitParams(params: unknown): PathkitCompileParams | undefined {
  if (!params || typeof params !== 'object') {
    return undefined;
  }

  return params as PathkitCompileParams;
}

function mapPathkitCompileError(route: NormalizedRoute, params: unknown, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const missing = /^\[Compile\] Missing required parameter: (.+)$/.exec(message);

  if (missing?.[1]) {
    const param = route.params.find((candidate) => candidate.name === missing[1]);
    return createMissingParamError(
      route.id,
      missing[1],
      param?.token ?? `{${missing[1]}}`,
      asParamRecord(params)[missing[1]],
    );
  }

  const invalid = route.params.find((candidate) =>
    message.includes(`Parameter "${candidate.name}"`),
  );

  if (invalid) {
    return createInvalidParamError(
      route.id,
      invalid.name,
      invalid.token,
      asParamRecord(params)[invalid.name],
    );
  }

  return error instanceof Error ? error : new Error(message);
}

function serializeSearch(search: unknown): string {
  if (!search || typeof search !== 'object') {
    return '';
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function serializeHash(hash: unknown): string {
  if (!hash) {
    return '';
  }

  const value = String(hash);
  return value.startsWith('#') ? value : `#${value}`;
}

function createRouteLookup(
  routes: readonly NormalizedRoute[],
): ReadonlyMap<string, NormalizedRoute> {
  const lookup = new Map<string, NormalizedRoute>();
  appendRoutesToLookup(routes, lookup);
  return lookup;
}

function appendRoutesToLookup(
  routes: readonly NormalizedRoute[],
  lookup: Map<string, NormalizedRoute>,
): void {
  for (const route of routes) {
    lookup.set(route.id, route);
    appendRoutesToLookup(route.children, lookup);

    for (const slot of Object.values(route.layout?.slots ?? {})) {
      appendRoutesToLookup(slot.routes, lookup);
    }
  }
}

function asParamRecord(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== 'object') {
    return {};
  }

  return params as Record<string, unknown>;
}

function applyBasename(pathname: string, basename?: string): string {
  const normalizedBasename = normalizeBasename(basename);
  return normalizedBasename ? `${normalizedBasename}${pathname === '/' ? '' : pathname}` : pathname;
}

function parseSearch(search: string): Record<string, string | readonly string[]> {
  if (!search) {
    return {};
  }

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const parsed: Record<string, string | string[]> = {};

  for (const [key, value] of params) {
    const current = parsed[key];

    if (current === undefined) {
      parsed[key] = value;
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
      continue;
    }

    parsed[key] = [current, value];
  }

  return parsed;
}

function stripBasename(pathname: string, basename?: string): string {
  const normalizedBasename = normalizeBasename(basename);

  if (!normalizedBasename) {
    return pathname;
  }

  if (pathname === normalizedBasename) {
    return '/';
  }

  if (!pathname.startsWith(`${normalizedBasename}/`)) {
    return pathname;
  }

  return pathname.slice(normalizedBasename.length) || '/';
}

function normalizeBasename(basename?: string): string {
  if (!basename || basename === '/') {
    return '';
  }

  return basename.startsWith('/') ? basename.replace(/\/$/, '') : `/${basename.replace(/\/$/, '')}`;
}

interface ResolveNavigationInterceptOptions {
  readonly source: RouteMatch | null;
  readonly destination: RouteMatch | null;
  readonly location: RouterLocation;
  readonly basename: string | undefined;
  readonly previousHref: string;
  readonly intercept?: InterceptInput;
  readonly context?: unknown;
  readonly production: boolean;
  readonly pathOptions: RouterPathOptions;
}

function resolveNavigationIntercept(
  options: ResolveNavigationInterceptOptions,
): ResolvedIntercept | null {
  try {
    return resolveIntercept({
      source: options.source,
      destination: options.destination,
      destinationPathname: stripBasename(options.location.pathname, options.basename),
      ...(options.intercept === undefined ? {} : { intercept: options.intercept }),
      ...(options.context === undefined ? {} : { context: options.context }),
      production: options.production,
      pathOptions: options.pathOptions,
      previousHref: options.previousHref,
    });
  } catch (error) {
    if (options.production) {
      return null;
    }

    throw error;
  }
}

function createInterceptedRoute(
  intercept: ResolvedIntercept,
  destination: RouteMatch | null,
): ResolvedInterceptedRoute | undefined {
  if (!destination) {
    return undefined;
  }

  return {
    slot: intercept.slot,
    sourceRouteId: intercept.sourceRouteId,
    targetRouteId: intercept.targetRouteId,
    previousHref: intercept.previousLocation,
    match: destination,
    component: intercept.component,
    ...(intercept.context === undefined ? {} : { context: intercept.context }),
  };
}

function resolveActiveInterceptSource(
  fromMatch: RouteMatch | null,
  interceptInput: InterceptInput | undefined,
  routes: readonly NormalizedRoute[],
  basename: string | undefined,
  pathOptions: RouterPathOptions,
): RouteMatch | null {
  if (!fromMatch?.intercepted) {
    return fromMatch;
  }

  if (interceptInput === undefined) {
    return null;
  }

  return matchRoutes(
    routes,
    stripBasename(fromMatch.intercepted.previousHref, basename),
    pathOptions,
  );
}

function restorePreviousSource(
  state: unknown,
  routes: readonly NormalizedRoute[],
  basename: string | undefined,
  pathOptions: RouterPathOptions,
): RouteMatch | null {
  if (!state || typeof state !== 'object' || !('__cookbookRouterIntercept' in state)) {
    return null;
  }

  const intercept = (
    state as { readonly __cookbookRouterIntercept?: { readonly previousHref?: string } }
  ).__cookbookRouterIntercept;

  if (!intercept?.previousHref) {
    return null;
  }

  return matchRoutes(
    routes,
    stripBasename(parseHref(intercept.previousHref).pathname, basename),
    pathOptions,
  );
}

function isProduction(): boolean {
  const runtime = globalThis as typeof globalThis & {
    readonly process?: { readonly env?: { readonly NODE_ENV?: string } };
  };
  return runtime.process?.env?.NODE_ENV === 'production';
}
