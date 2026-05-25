import { Component, Suspense, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type {
  MatchedRoute,
  ResolvedSlots,
  RouteComponent,
  Router,
  RouterState,
} from '@cookbook/router';
import {
  OutletContext,
  RouteRenderContext,
  RouterContext,
  SlotRenderContext,
} from '../context/router-context';

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

export interface RouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
  readonly scrollRestoration?: boolean;
}

export interface RenderMatchesOptions {
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
}

interface RouteErrorBoundaryProps {
  readonly match: MatchedRoute;
  readonly fallback?: ComponentType<RouteErrorFallbackProps>;
  readonly globalFallback?: ComponentType<RouterErrorFallbackProps>;
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
  const rendered = redirecting
    ? null
    : (props.children ??
      renderMatches(activeMatch?.branch ?? [], props.fallback ?? null, activeMatch?.slots ?? {}, {
        ...(props.loadingFallback === undefined ? {} : { loadingFallback: props.loadingFallback }),
        ...(props.errorFallback === undefined ? {} : { errorFallback: props.errorFallback }),
      }));
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
  const layoutElement = renderLayoutElement(match, routeElement, slots);
  const rendered = (
    <RouteRenderContext.Provider value={{ match }}>{layoutElement}</RouteRenderContext.Provider>
  );

  return renderRouteBoundary(match, rendered);
}

function renderRouteElement(match: MatchedRoute, child: ReactNode): ReactNode {
  const Component = asComponent(match.route.component);
  return Component ? <Component /> : child;
}

function renderLayoutElement(
  match: MatchedRoute,
  outlet: ReactNode,
  slots: ResolvedSlots,
): ReactNode {
  const Layout = asComponent(match.route.layout?.component);

  if (!Layout) {
    return outlet;
  }

  return (
    <RouteRenderContext.Provider value={{ match }}>
      <SlotRenderContext.Provider value={{ ownerRouteId: match.id, slots }}>
        <OutletContext.Provider value={{ outlet }}>
          <Layout />
        </OutletContext.Provider>
      </SlotRenderContext.Provider>
    </RouteRenderContext.Provider>
  );
}

export function renderRouteBoundary(match: MatchedRoute, element: ReactNode): ReactNode {
  const ErrorFallback = asComponent<RouteErrorFallbackProps>(match.route.route.errorFallback);
  const Loading = asComponent<RouteLoadingFallbackProps>(match.route.route.loading);
  const suspenseElement = Loading ? (
    <Suspense fallback={<Loading route={match} />}>{element}</Suspense>
  ) : (
    element
  );

  if (!ErrorFallback) {
    return suspenseElement;
  }

  return (
    <RouteErrorBoundary match={match} fallback={ErrorFallback}>
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
