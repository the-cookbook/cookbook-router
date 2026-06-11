import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { Middleware, RouteMatch, Router, RouterState } from '@cookbook/router';
import { RouterContext } from './router-context';
import { renderReactRouteMatch } from './render-react-route-match';
import type {
  RenderReactRouteMatchOptions,
  RouterErrorFallbackProps,
} from './render-react-route-match';
export {
  asReactView,
  renderReactRouteMatch,
  renderRouteBoundary,
} from './render-react-route-match';
export type {
  InheritedRouteFallbacks,
  RenderReactRouteMatchOptions,
  ResolvedErrorFallback,
  ResolvedLoadingFallback,
  RouteErrorFallbackProps,
  RouteLoadingFallbackProps,
  RouterErrorFallbackProps,
} from './render-react-route-match';

/** Scroll behavior used when the provider restores scroll after navigation. */
export type RouterScrollBehavior = ScrollBehavior;

/**
 * Props for the React router provider.
 *
 * The provider subscribes to router state, renders the active branch, registers
 * runtime middleware, handles scroll restoration, and coordinates Suspense/error
 * boundaries. URL behavior is owned by the router. React call-site URL build options on
 * href/navigation APIs and link views override route-level and router-level
 * build defaults. State-reading hooks use already-resolved router state and do
 * not accept URL options.
 */
export interface RouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
  readonly middleware?: readonly Middleware[];
  readonly scrollRestoration?: boolean;
  readonly scrollBehavior?: RouterScrollBehavior;
}

/**
 * Provides router state to React and renders the active route branch.
 */
export function RouterProvider(props: RouterProviderProps): ReactElement {
  const state = useRouterState(props.router);
  const redirecting = state.error === undefined && isRedirectMatch(state);

  useEffect(() => {
    if (!props.middleware?.length) {
      return;
    }

    const unregister = props.router.useMiddleware(props.middleware);
    void props.router.resolveCurrent();

    return unregister;
  }, [props.router, props.middleware]);

  useEffect(() => {
    if (!redirecting) {
      return;
    }

    void props.router.resolveCurrent();
  }, [props.router, redirecting, state.location.href]);

  useLayoutEffect(() => {
    syncHydratedBrowserHash(props.router, state);
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [props.router, state.location.hash, state.location.pathname, state.location.search]);

  const activeMatch = createRenderableMatch(
    state.match?.intercepted && state.previousLocation
      ? props.router.match(state.previousLocation.pathname)
      : state.match,
    state.match,
  );
  const renderOptions = useMemo<RenderReactRouteMatchOptions>(
    () => ({
      ...(props.loadingFallback === undefined ? {} : { loadingFallback: props.loadingFallback }),
      ...(props.errorFallback === undefined ? {} : { errorFallback: props.errorFallback }),
    }),
    [props.errorFallback, props.loadingFallback],
  );

  useScrollRestoration(props.scrollRestoration === true, state.location, props.scrollBehavior);

  const rendered = redirecting
    ? null
    : (props.children ??
      renderRouterState(activeMatch, state.error, props.fallback ?? null, renderOptions, props));
  const contextValue = useMemo(() => ({ router: props.router, state }), [props.router, state]);

  return <RouterContext.Provider value={contextValue}>{rendered}</RouterContext.Provider>;
}

function syncHydratedBrowserHash(router: Router, state: RouterState): void {
  if (typeof globalThis.window === 'undefined') {
    return;
  }

  const { location } = globalThis.window;

  if (
    state.location.pathname !== location.pathname ||
    state.location.search !== location.search ||
    state.location.hash === location.hash
  ) {
    return;
  }

  void router.resolveCurrent();
}

function renderRouterState(
  activeMatch: RouterState['match'],
  error: unknown | undefined,
  fallback: ReactNode,
  renderOptions: RenderReactRouteMatchOptions,
  props: RouterProviderProps,
): ReactNode {
  if (error !== undefined && !activeMatch) {
    const ErrorFallback = props.errorFallback;

    if (!ErrorFallback) {
      return fallback;
    }

    return <ErrorFallback error={error} reset={() => void props.router.resolveCurrent()} />;
  }

  return renderReactRouteMatch(activeMatch, fallback, {
    ...renderOptions,
    ...(error === undefined ? {} : { error }),
  });
}

function createRenderableMatch(
  activeMatch: RouteMatch | null,
  stateMatch: RouteMatch | null,
): RouteMatch | null {
  if (!activeMatch || !stateMatch?.intercepted) {
    return activeMatch;
  }

  return {
    ...activeMatch,
    intercepted: stateMatch.intercepted,
  };
}

/** Subscribes React rendering to router state with `useSyncExternalStore`. */
export function useRouterState(router: Router): RouterState {
  return useSyncExternalStore(
    router.subscribe,
    () => router.state,
    () => router.state,
  );
}

function useScrollRestoration(
  enabled: boolean,
  location: RouterState['location'],
  behavior: ScrollBehavior = 'auto',
): void {
  const positions = useRef(new Map<string, { readonly x: number; readonly y: number }>());
  const locationKey = location.key;

  useLayoutEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const currentPositions = positions.current;
    const position = currentPositions.get(locationKey);
    const preventScrollReset = shouldPreventScrollReset(location.state);

    if (preventScrollReset) {
      return () => {
        currentPositions.set(locationKey, {
          x: window.scrollX,
          y: window.scrollY,
        });
      };
    }

    if (position) {
      window.scrollTo({
        left: position.x,
        top: position.y,
        behavior,
      });
    } else if (!location.hash) {
      window.scrollTo({
        left: 0,
        top: 0,
        behavior,
      });
    }

    return () => {
      currentPositions.set(locationKey, {
        x: window.scrollX,
        y: window.scrollY,
      });
    };
  }, [behavior, enabled, location.hash, location.state, locationKey]);
}

function shouldPreventScrollReset(state: unknown): boolean {
  if (!state || typeof state !== 'object') {
    return false;
  }

  const scrollState = (
    state as {
      readonly __cookbookRouterScroll?: { readonly preventReset?: boolean };
    }
  ).__cookbookRouterScroll;

  return scrollState?.preventReset === true;
}

function isRedirectMatch(state: RouterState): boolean {
  return state.match?.branch.some((match) => match.route.route.redirect !== undefined) === true;
}
