import { parseHref, type RouterLocation } from '../history/memory-history';
import {
  createInterceptHistoryState,
  restoreInterceptFromState,
  type InterceptInput,
} from '../rendering/resolve-intercepts';
import { completeTransition, runTransition } from '../transition/run-transition';
import type { RegisteredRouteMatch, RouteMatch } from '../route-config/contracts';
import { createUnknownRouteError } from '../diagnostics/router-errors';
import type {
  CreateRouterOptions,
  HrefOptions,
  NavigateOptions,
  PreloadHrefOptions,
  PreloadOptions,
  Router,
  RouterState,
} from './contracts';
import { type RouterUrlBuildOptions, type RouterUrlOptions } from '../url-state';
import { createRouteHref } from './create-href';
import { normalizeNavigateTarget, resolveNavigationTarget } from './navigation-target';
import { createScrollHistoryState } from './scroll-history-state';
import { createRouterState } from './router-state';
import { initializeRouterHydration } from './hydration-state';
import { createRouterStateStore } from './router-state-store';
import { createRouterMatcher } from './router-matcher';
import { createRuntimeMiddlewareRegistry } from './middleware-registry';
import { createRouteRuntimeContext } from './route-runtime-context';
import { createActiveNavigationTracker } from './active-navigation';
import { createNavigationBlockerRegistry } from './blockers';
import { canonicalizeLocation as canonicalizeRouterLocation } from './canonical-location';
import { createRouteRedirectHref, isExternalHref, resolveMatchedRouteRedirect } from './redirects';
import {
  createInterceptedRoute,
  isProduction,
  resolveActiveInterceptSource,
  resolveNavigationIntercept,
  restorePreviousSource,
} from './intercept-navigation';
import { runRoutePreload } from './route-preload';

/**
 * Creates a router from an explicit history implementation.
 *
 * This lower-level helper is mainly useful for custom histories and tests.
 */

export function createRouterRuntime(
  options: Required<Pick<CreateRouterOptions, 'history'>> & CreateRouterOptions,
): Router {
  const {
    maxRedirectDepth,
    normalizedRoutes,
    pathConstraints,
    pathOptions,
    rankedRoutes,
    routeLookup,
  } = createRouteRuntimeContext(options);
  const matcher = createRouterMatcher({
    routes: normalizedRoutes,
    ...(options.basename === undefined ? {} : { basename: options.basename }),
    pathOptions,
    ...(pathConstraints === undefined ? {} : { pathConstraints }),
    ...(options.url === undefined ? {} : { routerUrl: options.url }),
  });
  const store = createRouterStateStore(createState(options.history.location, 'idle'));
  const blockerRegistry = createNavigationBlockerRegistry();
  const middlewareRegistry = createRuntimeMiddlewareRegistry(options.middleware);
  const activeNavigationTracker = createActiveNavigationTracker();
  let transitionVersion = 0;
  let started = false;
  let starting = false;
  let disposed = false;
  let unlistenHistory: (() => void) | undefined;
  let startPromise: Promise<RouterState> | undefined;
  const activePreloads = new Map<string, Promise<void>>();

  const router: Router = {
    routes: normalizedRoutes,
    rankedRoutes,
    get state() {
      return store.getState();
    },
    get started() {
      return started;
    },
    get starting() {
      return starting;
    },
    get disposed() {
      return disposed;
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
    preload(
      routeOrOptions: string | (NavigateOptions<string> & { readonly signal?: AbortSignal }),
      preloadOptions?: PreloadOptions<string>,
    ) {
      assertNotDisposed();
      const target = normalizeNavigateTarget(
        routeOrOptions as string | NavigateOptions<string>,
        preloadOptions as HrefOptions<string> | undefined,
      );
      const signal = getPreloadSignal(routeOrOptions, preloadOptions);
      const hrefOptions = removePreloadSignal(target.options);
      const href = router.href(target.route, hrefOptions);
      return preloadMatchedHref(href, {
        ...(hrefOptions?.url === undefined ? {} : { url: hrefOptions.url }),
        ...(signal === undefined ? {} : { signal }),
      });
    },
    preloadHref(href: string, preloadOptions?: PreloadHrefOptions) {
      assertNotDisposed();
      return preloadMatchedHref(href, preloadOptions);
    },
    navigate: {
      to(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
        assertNotDisposed();
        const target = resolveNavigationTarget(
          routeOrOptions as string | NavigateOptions<string>,
          hrefOptions as HrefOptions<string> | undefined,
          {
            createRouteHref: (routeId, routeOptions) => router.href(routeId, routeOptions),
            matchHref,
            routes: routeLookup,
          },
        );
        return navigateTo(
          target.href,
          'push',
          target.intercept,
          target.context,
          target.preventScrollReset,
          target.url,
        );
      },
      replace(routeOrOptions: string | NavigateOptions<string>, hrefOptions?: HrefOptions<string>) {
        assertNotDisposed();
        const target = resolveNavigationTarget(
          routeOrOptions as string | NavigateOptions<string>,
          hrefOptions as HrefOptions<string> | undefined,
          {
            createRouteHref: (routeId, routeOptions) => router.href(routeId, routeOptions),
            matchHref,
            routes: routeLookup,
          },
        );
        return navigateTo(
          target.href,
          'replace',
          target.intercept,
          target.context,
          target.preventScrollReset,
          target.url,
        );
      },
      back() {
        assertNotDisposed();
        options.history.back();
      },
      forward() {
        assertNotDisposed();
        options.history.forward();
      },
      go(delta) {
        assertNotDisposed();
        options.history.go(delta);
      },
    },
    subscribe(listener) {
      if (disposed) {
        return () => undefined;
      }

      return store.subscribe(listener);
    },
    block(blocker) {
      assertNotDisposed();
      return blockerRegistry.add(blocker);
    },
    useMiddleware(middleware) {
      assertNotDisposed();
      return middlewareRegistry.useMiddleware(middleware);
    },
    start() {
      assertNotDisposed();

      if (started) {
        return Promise.resolve(store.getState());
      }

      if (startPromise) {
        return startPromise;
      }

      starting = true;
      startPromise = transitionTo(options.history.location, 'replace', false)
        .then((state) => {
          if (!disposed) {
            started = true;
          }

          return state;
        })
        .finally(() => {
          if (!disposed) {
            starting = false;
          }

          startPromise = undefined;
        });

      return startPromise;
    },
    refresh() {
      assertNotDisposed();
      return transitionTo(options.history.location, 'replace', false);
    },
    serialize() {
      return {
        location: store.getState().location,
        navigation: store.getState().navigation,
      };
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      starting = false;
      started = false;
      startPromise = undefined;
      transitionVersion += 1;
      activePreloads.clear();
      unlistenHistory?.();
      unlistenHistory = undefined;
      blockerRegistry.clear();
      middlewareRegistry.clear();
      store.clearListeners();
    },
  };

  let ignoreNextHistoryEvent = false;

  unlistenHistory = options.history.listen((event) => {
    if (disposed) {
      return;
    }

    if (ignoreNextHistoryEvent) {
      ignoreNextHistoryEvent = false;
      return;
    }

    void transitionTo(event.location, event.action === 'replace' ? 'replace' : 'push', false);
  });

  initializeRouterHydration({
    ...(options.hydrationData === undefined ? {} : { hydrationData: options.hydrationData }),
    history: options.history,
    store,
    createState,
  });

  function assertNotDisposed(): void {
    if (!disposed) {
      return;
    }

    throw new Error(
      'Router has been disposed. Create a new router instance before starting, navigating, refreshing, or preloading.',
    );
  }

  function matchHref(href: string, callUrl?: RouterUrlOptions): RouteMatch | null {
    return matcher.matchHref(href, callUrl);
  }

  function matchHrefResult(href: string, callUrl?: RouterUrlOptions) {
    return matcher.matchHrefResult(href, callUrl);
  }

  function preloadMatchedHref(href: string, preloadOptions?: PreloadHrefOptions): Promise<void> {
    const match = matchHref(href, preloadOptions?.url);

    if (!match) {
      throw createUnknownRouteError(href);
    }

    if (preloadOptions?.signal !== undefined) {
      return runRoutePreload({ match, signal: preloadOptions.signal });
    }

    const key = createPreloadKey(href, preloadOptions?.url);
    const active = activePreloads.get(key);

    if (active) {
      return active;
    }

    const promise = runRoutePreload({ match }).finally(() => {
      activePreloads.delete(key);
    });
    activePreloads.set(key, promise);
    return promise;
  }

  function createState(
    location: RouterLocation,
    navigation: Parameters<typeof createRouterState>[0]['navigation'],
    error?: unknown,
    intercepted?: Parameters<typeof createRouterState>[0]['intercepted'],
    previousLocation?: RouterLocation,
    callUrl?: RouterUrlBuildOptions,
  ): RouterState {
    return createRouterState({
      location,
      navigation,
      ...(error === undefined ? {} : { error }),
      ...(intercepted === undefined ? {} : { intercepted }),
      ...(previousLocation === undefined ? {} : { previousLocation }),
      ...(callUrl === undefined ? {} : { callUrl }),
      matchHrefResult,
    });
  }

  function setState(nextState: RouterState): RouterState {
    if (disposed) {
      return store.getState();
    }

    return store.setState(nextState);
  }

  function getPreloadSignal(
    routeOrOptions: string | (NavigateOptions<string> & { readonly signal?: AbortSignal }),
    preloadOptions: PreloadOptions<string> | undefined,
  ): AbortSignal | undefined {
    if (typeof routeOrOptions === 'object' && routeOrOptions !== null) {
      return routeOrOptions.signal ?? preloadOptions?.signal;
    }

    return preloadOptions?.signal;
  }

  function removePreloadSignal(
    preloadOptions: PreloadOptions<string> | undefined,
  ): HrefOptions<string> | undefined {
    if (!preloadOptions) {
      return undefined;
    }

    const { signal: _signal, ...hrefOptions } = preloadOptions;
    return hrefOptions;
  }

  function createPreloadKey(href: string, callUrl: RouterUrlOptions | undefined): string {
    return callUrl === undefined ? href : `${href}::${JSON.stringify(callUrl)}`;
  }

  function navigateTo(
    href: string,
    mode: 'push' | 'replace',
    intercept?: InterceptInput,
    context?: unknown,
    preventScrollReset?: boolean,
    callUrl?: RouterUrlBuildOptions,
  ): Promise<RouterState> {
    const activeNavigationRequest = {
      href,
      mode,
      ...(callUrl === undefined ? {} : { url: callUrl }),
      ...(intercept === undefined ? {} : { intercept }),
      ...(context === undefined ? {} : { context }),
      ...(preventScrollReset === undefined ? {} : { preventScrollReset }),
    };
    const matchingNavigation = activeNavigationTracker.getMatching(activeNavigationRequest);

    if (matchingNavigation) {
      return matchingNavigation;
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
    return activeNavigationTracker.start(activeNavigationRequest, promise);
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
    assertNotDisposed();
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

    const fromMatch = store.getState().match;
    const canonicalized = canonicalizeRouterLocation({
      location,
      ...(callUrl === undefined ? {} : { callUrl }),
      ...(options.basename === undefined ? {} : { basename: options.basename }),
      ...(options.history.mode === undefined ? {} : { historyMode: options.history.mode }),
      pathOptions,
      ...(pathConstraints === undefined ? {} : { pathConstraints }),
      ...(options.url === undefined ? {} : { routerUrl: options.url }),
      matchHrefResult,
    });
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
        return setState({ ...store.getState(), navigation: 'redirecting' });
      }

      setState({ ...store.getState(), navigation: 'redirecting' });
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
          previousHref: fromMatch?.intercepted?.previousHref ?? store.getState().location.href,
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
      if (
        await blockerRegistry.run({
          from: fromMatch,
          to: nextMatch,
          location: transitionLocation,
        })
      ) {
        if (!writeHistory && options.history.mode !== 'static') {
          ignoreNextHistoryEvent = true;
          options.history.replace(store.getState().location.href, store.getState().location.state);
        }

        return setState({ ...store.getState(), navigation: 'blocked' });
      }
    } catch (error) {
      return setState(createState(transitionLocation, 'error', error));
    }

    setState({ ...store.getState(), navigation: 'pending' });

    const result = await runTransition({
      from: fromMatch,
      to: nextMatch,
      location: transitionLocation,
      middleware: getActiveMiddleware(),
      ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
    });

    if (currentTransitionVersion !== transitionVersion) {
      return store.getState();
    }

    if (result instanceof Response) {
      return setState(createState(transitionLocation, 'error', result));
    }

    if (result.type === 'blocked') {
      return setState({ ...store.getState(), navigation: 'blocked' });
    }

    if (result.type === 'redirect') {
      setState({ ...store.getState(), navigation: 'redirecting' });

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
        return store.getState();
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
      setState({ ...store.getState(), navigation: 'redirecting' });

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

  function getActiveMiddleware() {
    return middlewareRegistry.getActiveMiddleware();
  }

  return router;
}
