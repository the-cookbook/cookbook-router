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
  normalizePathOptions,
  prunePathname,
  type RouterPathConstraints,
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
import { createHydrationMismatchError } from '../diagnostics/router-errors';
import {
  buildRoutePath,
  registerUrlPathConstraints,
  type RouterUrlBuildOptions,
  type RouterUrlOptions,
} from '../url';
import { createRouteHref } from './create-href';
import { createRouteLookup } from './create-route-lookup';
import { matchLocationResult, type MatchLocationResult } from './match-location';
import { applyBasename, stripBasename } from './pathname';

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
 * `intercept` explicitly requests or disambiguates a slot intercept. Configured
 * route intercepts are still automatic when the active source route declares
 * them. `context` is carried to intercepted rendering state.
 */
export interface HrefOptions<Route extends string> extends RouteUrlOptions<Route> {
  /** Per-call URLKit build options that override route-level and router-level defaults. */
  readonly url?: RouterUrlBuildOptions;
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

interface ScrollHistoryState {
  readonly __cookbookRouterScroll?: {
    readonly preventReset?: boolean;
  };
}

interface ActiveNavigation {
  readonly href: string;
  readonly mode: 'push' | 'replace';
  readonly url?: RouterUrlBuildOptions;
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
  const pathConstraints = mergePathConstraints(
    definedRouteOptions?.pathConstraints,
    options.pathConstraints,
  );
  registerUrlPathConstraints(pathConstraints);
  const pathOptions = normalizePathOptions(options.pathOptions ?? definedRouteOptions?.pathOptions);
  const maxRedirectDepth = normalizeMaxRedirectDepth(options);
  validateRoutes(options.routes, pathOptions);
  const normalizedRoutes = normalizeRoutes(options.routes, pathOptions);
  validateInterceptTargets(normalizedRoutes);
  const rankedRoutes = rankRoutes(normalizedRoutes);
  const routeLookup = createRouteLookup(normalizedRoutes);
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
      return createRouteHref({
        routeId: target.route,
        ...(target.options === undefined ? {} : { options: target.options }),
        routes: routeLookup,
        ...(options.basename === undefined ? {} : { basename: options.basename }),
        ...(options.url === undefined ? {} : { routerUrl: options.url }),
        ...(pathConstraints === undefined ? {} : { pathConstraints }),
      });
    },
    resolve(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
      const target = normalizeNavigateTarget(
        routeOrOptions as string | NavigateOptions<string>,
        hrefOptions as HrefOptions<string> | undefined,
      );
      const match = router.match(router.href(target.route, target.options), {
        ...(target.options?.url === undefined ? {} : { url: target.options.url }),
      });

      if (!match) {
        throw new Error(`Resolved route "${target.route}" did not match its generated href.`);
      }

      return match;
    },
    match(href, matchOptions) {
      return matchHref(href, matchOptions?.url) as RegisteredRouteMatch | null;
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
          target.options?.url,
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
          target.options?.url,
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
    const historyLocation = options.history.location;
    const hydrationError = isHydrationPathSearchMatch(
      options.hydrationData.location,
      historyLocation,
    )
      ? undefined
      : createHydrationMismatchError(options.hydrationData.location.href, historyLocation.href);

    state = createState(
      options.hydrationData.location,
      options.hydrationData.navigation,
      hydrationError,
    );

    if (
      hydrationError === undefined &&
      options.hydrationData.location.hash !== historyLocation.hash
    ) {
      scheduleHydrationHashSync(options.hydrationData.location);
    }
  }

  function scheduleHydrationHashSync(hydratedLocation: RouterLocation): void {
    scheduleMacrotask(() => {
      if (state.location.href !== hydratedLocation.href) {
        return;
      }

      const historyLocation = options.history.location;

      if (
        !isHydrationPathSearchMatch(hydratedLocation, historyLocation) ||
        hydratedLocation.hash === historyLocation.hash
      ) {
        return;
      }

      void transitionTo(historyLocation, 'replace', false);
    });
  }

  function matchHref(href: string, callUrl?: RouterUrlOptions): RouteMatch | null {
    const result = matchHrefResult(href, callUrl);

    if (result.status === 'no-match') {
      return null;
    }

    return result.match;
  }

  function matchHrefResult(href: string, callUrl?: RouterUrlOptions): MatchLocationResult {
    return matchLocationResult({
      routes: normalizedRoutes,
      location: parseHref(href),
      ...(options.basename === undefined ? {} : { basename: options.basename }),
      pathOptions,
      ...(options.url === undefined ? {} : { routerUrl: options.url }),
      ...(callUrl === undefined ? {} : { callUrl }),
      ...(pathConstraints === undefined ? {} : { pathConstraints }),
    });
  }

  function createState(
    location: RouterLocation,
    navigation: RouterNavigationState,
    error?: unknown,
    intercepted?: ResolvedInterceptedRoute,
    previousLocation?: RouterLocation,
    callUrl?: RouterUrlBuildOptions,
  ): RouterState {
    const baseMatchResult = matchHrefResult(location.href, callUrl);
    const baseMatch = baseMatchResult.status === 'no-match' ? null : baseMatchResult.match;
    const match = intercepted && baseMatch ? { ...baseMatch, intercepted } : baseMatch;
    const next: RouterState = {
      location,
      match,
      navigation,
      ...(previousLocation === undefined ? {} : { previousLocation }),
    };
    const stateError =
      error ?? (baseMatchResult.status === 'error' ? baseMatchResult.error : undefined);

    if (stateError !== undefined) {
      return { ...next, error: stateError };
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
    callUrl?: RouterUrlBuildOptions,
  ): Promise<RouterState> {
    if (
      activeNavigation &&
      activeNavigation.href === href &&
      activeNavigation.mode === mode &&
      activeNavigation.url === callUrl &&
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
    const promise = transitionTo(
      location,
      mode,
      true,
      0,
      intercept,
      context,
      preventScrollReset,
      callUrl,
    );
    const navigation: ActiveNavigation = {
      href,
      mode,
      promise,
      ...(callUrl === undefined ? {} : { url: callUrl }),
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
    callUrl?: RouterUrlBuildOptions,
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
    const canonicalized = canonicalizeLocation(location, callUrl);
    const transitionLocation = canonicalized.location;
    const nextMatch = canonicalized.match;

    if (canonicalized.error !== undefined) {
      return setState(
        createState(
          transitionLocation,
          'error',
          canonicalized.error,
          undefined,
          undefined,
          callUrl,
        ),
      );
    }

    const routeRedirect = resolveMatchedRouteRedirect(nextMatch);

    if (routeRedirect) {
      const redirectHref = createRouteRedirectHref(routeRedirect, routeLookup, options.basename, {
        ...(options.url === undefined ? {} : { routerUrl: options.url }),
        ...(pathConstraints === undefined ? {} : { pathConstraints }),
      });

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
      createState(transitionLocation, 'idle', undefined, intercepted, previousLocation, callUrl),
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
        createState(transitionLocation, 'error', error, intercepted, previousLocation, callUrl),
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

  function canonicalizeLocation(
    location: RouterLocation,
    callUrl?: RouterUrlOptions,
  ): {
    readonly location: RouterLocation;
    readonly match: RouteMatch | null;
    readonly replaced: boolean;
    readonly error?: unknown;
  } {
    let nextLocation = location;
    let nextMatchResult = matchHrefResult(nextLocation.href, callUrl);
    let nextMatch = nextMatchResult.status === 'no-match' ? null : nextMatchResult.match;

    if (!nextMatch) {
      const prunedPathname = prunePathname(nextLocation.pathname, pathOptions);

      if (prunedPathname !== nextLocation.pathname) {
        const candidate = parseHref(`${prunedPathname}${nextLocation.search}${nextLocation.hash}`, {
          ...(nextLocation.state === undefined ? {} : { state: nextLocation.state }),
          key: nextLocation.key,
        });
        const candidateMatchResult = matchHrefResult(candidate.href, callUrl);
        const candidateMatch =
          candidateMatchResult.status === 'no-match' ? null : candidateMatchResult.match;

        if (candidateMatch) {
          nextLocation = candidate;
          nextMatchResult = candidateMatchResult;
          nextMatch = candidateMatch;
        }
      }
    }

    if (!nextMatch) {
      return { location: nextLocation, match: nextMatch, replaced: false };
    }

    if (nextMatchResult.status === 'error') {
      return {
        location: nextLocation,
        match: nextMatch,
        replaced: false,
        error: nextMatchResult.error,
      };
    }

    const canonicalPathname = applyBasename(
      buildRoutePath(nextMatch.route, nextMatch.params, {
        ...(options.url === undefined ? {} : { routerUrl: options.url }),
        ...(pathConstraints === undefined ? {} : { pathConstraints }),
      }),
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

    const canonicalMatchResult = matchHrefResult(canonicalLocation.href, callUrl);

    return {
      location: canonicalLocation,
      match: canonicalMatchResult.status === 'no-match' ? null : canonicalMatchResult.match,
      replaced: options.history.mode !== 'static',
      ...(canonicalMatchResult.status === 'error' ? { error: canonicalMatchResult.error } : {}),
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

interface RouteRedirectHrefOptions {
  readonly routerUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

function createRouteRedirectHref(
  redirect: RouteRedirect,
  routes: ReadonlyMap<string, NormalizedRoute>,
  basename: string | undefined,
  options: RouteRedirectHrefOptions,
): string {
  if (typeof redirect === 'string') {
    return redirect;
  }

  return createRouteHref({
    routeId: redirect.route,
    options: {
      ...(redirect.params === undefined ? {} : { params: redirect.params }),
      ...(redirect.search === undefined ? {} : { search: redirect.search }),
      ...(redirect.hash === undefined ? {} : { hash: redirect.hash }),
    },
    routes,
    ...(basename === undefined ? {} : { basename }),
    ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
  });
}

function isExternalHref(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

export {
  deserializeRouterState,
  serializeRouterState,
  stringifyRouterState,
} from './serialize-router-state';

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

function isHydrationPathSearchMatch(
  serverLocation: RouterLocation,
  clientLocation: RouterLocation,
): boolean {
  return (
    serverLocation.pathname === clientLocation.pathname &&
    serverLocation.search === clientLocation.search
  );
}

function scheduleMacrotask(callback: () => void): void {
  if (typeof globalThis.setTimeout === 'function') {
    globalThis.setTimeout(callback, 0);
    return;
  }

  callback();
}

function createDefaultHistory(initialHref?: string): RouterHistory {
  if (typeof globalThis.window === 'undefined') {
    return createMemoryHistory({ initialEntries: [initialHref ?? '/'] });
  }

  return createBrowserHistory();
}

function mergePathConstraints(
  left?: RouterPathConstraints,
  right?: RouterPathConstraints,
): RouterPathConstraints | undefined {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return { ...left, ...right };
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
    stripBasename(parseHref(fromMatch.intercepted.previousHref).pathname, basename),
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
