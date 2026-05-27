import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type {
  MatchedRoute,
  ResolvedSlots,
  RouteComponent,
  Router,
  RouterState,
} from '@cookbook/router';
import {
  OutletRenderContext,
  RouteRenderContext,
  RouterContext,
  SlotRenderContext,
} from '../context/router-context';
import type { RenderBoundaryOptions } from '../context/router-context';

export interface RouteLoadingFallbackProps {
  readonly route: MatchedRoute;
}

export interface RouteErrorFallbackProps {
  readonly error: unknown;
  readonly reset: () => void;
  readonly route: MatchedRoute;
}

export interface RouterErrorFallbackProps {
  readonly error: unknown;
  readonly reset: () => void;
  readonly route?: MatchedRoute;
}

export type RouterScrollBehavior = ScrollBehavior;

export interface RouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
  readonly scrollRestoration?: boolean;
  readonly scrollBehavior?: RouterScrollBehavior;
}

export interface RenderMatchesOptions extends RenderBoundaryOptions {}

interface RouteErrorBoundaryProps {
  readonly match: MatchedRoute;
  readonly fallback?: ComponentType<RouteErrorFallbackProps> | undefined;
  readonly globalFallback?: ComponentType<RouterErrorFallbackProps> | undefined;
  readonly children: ReactNode;
}

interface RouteErrorBoundaryState {
  readonly error: unknown | undefined;
}

export function RouterProvider(props: RouterProviderProps): ReactElement {
  const state = useRouterState(props.router);
  const redirecting = state.error === undefined && isRedirectMatch(state);

  useEffect(() => {
    if (!redirecting) {
      return;
    }

    void props.router.resolveCurrent();
  }, [props.router, redirecting, state.location.href]);
  const activeMatch =
    state.match?.intercepted && state.previousLocation
      ? props.router.match(state.previousLocation.pathname)
      : state.match;
  const renderOptions = useMemo<RenderMatchesOptions>(
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
      renderMatches(
        activeMatch?.branch ?? [],
        props.fallback ?? null,
        activeMatch?.slots ?? {},
        renderOptions,
      ));
  const contextValue = useMemo(() => ({ router: props.router, state }), [props.router, state]);

  return <RouterContext.Provider value={contextValue}>{rendered}</RouterContext.Provider>;
}

export function useRouterState(router: Router): RouterState {
  return useSyncExternalStore(
    router.subscribe,
    () => router.state,
    () => router.state,
  );
}

export function renderMatches(
  matches: readonly MatchedRoute[],
  fallback: ReactNode,
  slots: ResolvedSlots = {},
  options: RenderMatchesOptions = {},
): ReactNode {
  if (!matches.length) {
    return fallback;
  }

  const rendered = renderMatchAt(matches, 0, fallback, slots, options);
  const lastMatch = matches[matches.length - 1];
  const errorBoundary =
    options.errorFallback && lastMatch ? (
      <RouteErrorBoundary match={lastMatch} globalFallback={options.errorFallback}>
        {rendered}
      </RouteErrorBoundary>
    ) : (
      rendered
    );

  return <Suspense fallback={options.loadingFallback ?? null}>{errorBoundary}</Suspense>;
}

function renderMatchAt(
  matches: readonly MatchedRoute[],
  index: number,
  fallback: ReactNode,
  slots: ResolvedSlots,
  options: RenderMatchesOptions,
): ReactNode {
  const match = matches[index];

  if (!match) {
    return fallback;
  }

  const child = renderMatchAt(matches, index + 1, fallback, slots, options);
  const routeElement = renderRouteElement(match, child);
  const layoutElement = renderLayoutElement(match, routeElement, slots, options);
  const rendered = (
    <RouteRenderContext.Provider value={{ match }}>{layoutElement}</RouteRenderContext.Provider>
  );

  return renderRouteBoundary(match, rendered, options);
}

function renderRouteElement(match: MatchedRoute, child: ReactNode): ReactNode {
  const Component = asComponent(match.route.component);

  if (!Component) {
    return child;
  }

  return (
    <OutletRenderContext.Provider value={{ outlet: child }}>
      <Component />
    </OutletRenderContext.Provider>
  );
}

function renderLayoutElement(
  match: MatchedRoute,
  outlet: ReactNode,
  slots: ResolvedSlots,
  options: RenderMatchesOptions,
): ReactNode {
  const Layout = asComponent(match.route.layout?.component);

  if (!Layout) {
    return outlet;
  }

  return (
    <RouteRenderContext.Provider value={{ match }}>
      <SlotRenderContext.Provider
        value={{
          ownerRouteId: match.id,
          slots,
          renderOptions: options,
        }}
      >
        <OutletRenderContext.Provider value={{ outlet }}>
          <Layout />
        </OutletRenderContext.Provider>
      </SlotRenderContext.Provider>
    </RouteRenderContext.Provider>
  );
}

export function renderRouteBoundary(
  match: MatchedRoute,
  element: ReactNode,
  options: RenderMatchesOptions = {},
): ReactNode {
  const ErrorFallback = asComponent<RouteErrorFallbackProps>(match.route.route.errorFallback);
  const Loading = asComponent<RouteLoadingFallbackProps>(match.route.route.loading);

  const suspenseElement = Loading ? (
    <Suspense fallback={<Loading route={match} />}>{element}</Suspense>
  ) : (
    element
  );

  if (!ErrorFallback && !options.errorFallback) {
    return suspenseElement;
  }

  return (
    <RouteErrorBoundary
      match={match}
      {...(ErrorFallback ? { fallback: ErrorFallback } : {})}
      {...(options.errorFallback ? { globalFallback: options.errorFallback } : {})}
    >
      {suspenseElement}
    </RouteErrorBoundary>
  );
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  readonly state: RouteErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryProps): void {
    if (previousProps.match.id !== this.props.match.id && this.state.error !== undefined) {
      this.setState({ error: undefined });
    }
  }

  render(): ReactNode {
    if (this.state.error !== undefined) {
      const reset = (): void => this.setState({ error: undefined });

      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} reset={reset} route={this.props.match} />;
      }

      if (this.props.globalFallback) {
        const Fallback = this.props.globalFallback;
        return <Fallback error={this.state.error} reset={reset} route={this.props.match} />;
      }
    }

    return this.props.children;
  }
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
  }, [behavior, enabled, location.hash, locationKey]);
}

export function asComponent<Props = Record<string, never>>(
  component: RouteComponent | undefined,
): ComponentType<Props> | null {
  if (typeof component === 'function') {
    return component as ComponentType<Props>;
  }

  if (typeof component === 'object' && component !== null && '$$typeof' in component) {
    return component as ComponentType<Props>;
  }

  return null;
}

function isRedirectMatch(state: RouterState): boolean {
  return state.match?.branch.some((match) => match.route.route.redirect !== undefined) === true;
}
