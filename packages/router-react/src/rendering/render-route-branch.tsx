import { Component, Suspense, memo } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { MatchedRoute, ResolvedSlots, RouteComponent } from '@cookbook/router';
import {
  OutletRenderContext,
  RouteRenderContext,
  SlotRenderContext,
} from '../context/router-context';
import type { RenderBoundaryOptions } from '../context/router-context';

/** Props passed to a route-local loading fallback component. */
export interface RouteLoadingFallbackProps {
  readonly route: MatchedRoute;
}

/** Props passed to a route-local error fallback component. */
export interface RouteErrorFallbackProps {
  readonly error: unknown;
  readonly reset: () => void;
  readonly route: MatchedRoute;
}

/** Props passed to the global router error fallback. */
export interface RouterErrorFallbackProps {
  readonly error: unknown;
  readonly reset: () => void;
  readonly route?: MatchedRoute;
}

/** Render options shared by branch and slot rendering helpers. */
export interface RenderMatchesOptions extends RenderBoundaryOptions {
  /** Router state error to surface through the active route error boundary. */
  readonly error?: unknown;
}

/** Concrete loading fallback selected for a matched route boundary. */
export interface ResolvedLoadingFallback {
  readonly component: RouteComponent;
  readonly match: MatchedRoute;
}

/** Concrete error fallback selected for a matched route boundary. */
export interface ResolvedErrorFallback {
  readonly component: RouteComponent;
  readonly match: MatchedRoute;
}

/** Layout fallback state inherited while rendering descendant matches. */
export interface InheritedRouteFallbacks {
  readonly loading?: ResolvedLoadingFallback;
  readonly error?: ResolvedErrorFallback;
}

interface RouteErrorBoundaryProps {
  readonly match: MatchedRoute;
  readonly fallback?: ComponentType<RouteErrorFallbackProps> | undefined;
  readonly globalFallback?: ComponentType<RouterErrorFallbackProps> | undefined;
  readonly children: ReactNode;
}

interface RouteErrorBoundaryState {
  readonly error: unknown | undefined;
}

/**
 * Renders a matched branch recursively with layouts, outlets, slots, loading
 * boundaries, and error boundaries.
 */
export function renderMatches(
  matches: readonly MatchedRoute[],
  fallback: ReactNode,
  slots: ResolvedSlots = {},
  options: RenderMatchesOptions = {},
): ReactNode {
  if (!matches.length) {
    return fallback;
  }

  const rendered = renderMatchAt(matches, 0, fallback, slots, options, {});

  return <Suspense fallback={options.loadingFallback ?? null}>{rendered}</Suspense>;
}

function renderMatchAt(
  matches: readonly MatchedRoute[],
  index: number,
  fallback: ReactNode,
  slots: ResolvedSlots,
  options: RenderMatchesOptions,
  inheritedFallbacks: InheritedRouteFallbacks,
): ReactNode {
  const match = matches[index];

  if (!match) {
    return fallback;
  }

  const layoutFallbacks = resolveLayoutFallbacks(match, inheritedFallbacks);
  const child = renderMatchAt(matches, index + 1, fallback, slots, options, layoutFallbacks);
  const isLeafMatch = index === matches.length - 1;
  const routeElement =
    isLeafMatch && options.error !== undefined
      ? renderRouteStateError(options.error)
      : renderRouteElement(match, child);
  const boundaryFallbacks = resolveBoundaryFallbacks(match, layoutFallbacks, isLeafMatch);
  const boundaryOptions =
    isLeafMatch || boundaryFallbacks.error ? options : omitGlobalErrorFallback(options);
  const boundaryElement = renderRouteBoundary(
    match,
    routeElement,
    boundaryOptions,
    boundaryFallbacks,
  );
  const layoutElement = renderLayoutElement(match, boundaryElement, slots, options);

  return (
    <RouteRenderContext.Provider value={{ match }}>{layoutElement}</RouteRenderContext.Provider>
  );
}

function renderRouteStateError(error: unknown): ReactNode {
  return <RouteStateError error={error} />;
}

function RouteStateError(props: { readonly error: unknown }): never {
  throw props.error;
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
  fallbacks?: InheritedRouteFallbacks,
): ReactNode {
  const resolvedFallbacks = fallbacks ?? resolveBoundaryFallbacks(match, {}, true);
  const ErrorFallback = asComponent<RouteErrorFallbackProps>(resolvedFallbacks.error?.component);

  return (
    <RouteErrorBoundary
      match={resolvedFallbacks.error?.match ?? match}
      {...(ErrorFallback ? { fallback: ErrorFallback } : {})}
      {...(options.errorFallback ? { globalFallback: options.errorFallback } : {})}
    >
      <Suspense
        fallback={
          <MemoizedRouteLoadingFallback
            fallback={resolvedFallbacks.loading}
            {...(options.loadingFallback === undefined
              ? {}
              : { globalFallback: options.loadingFallback })}
          />
        }
      >
        {element}
      </Suspense>
    </RouteErrorBoundary>
  );
}

function omitGlobalErrorFallback(options: RenderMatchesOptions): RenderMatchesOptions {
  if (options.errorFallback === undefined) {
    return options;
  }

  return {
    ...(options.loadingFallback === undefined ? {} : { loadingFallback: options.loadingFallback }),
  };
}

function resolveLayoutFallbacks(
  match: MatchedRoute,
  inheritedFallbacks: InheritedRouteFallbacks,
): InheritedRouteFallbacks {
  const loading = resolveLayoutLoading(match) ?? inheritedFallbacks.loading;
  const error = resolveLayoutErrorFallback(match) ?? inheritedFallbacks.error;

  return {
    ...(loading === undefined ? {} : { loading }),
    ...(error === undefined ? {} : { error }),
  };
}

function resolveBoundaryFallbacks(
  match: MatchedRoute,
  layoutFallbacks: InheritedRouteFallbacks,
  isLeafMatch: boolean,
): InheritedRouteFallbacks {
  const routeLoading = isLeafMatch ? resolveRouteLoading(match) : undefined;
  const routeError = isLeafMatch ? resolveRouteErrorFallback(match) : undefined;
  const loading = routeLoading ?? layoutFallbacks.loading;
  const error = routeError ?? layoutFallbacks.error;

  return {
    ...(loading === undefined ? {} : { loading }),
    ...(error === undefined ? {} : { error }),
  };
}

function resolveRouteLoading(match: MatchedRoute): ResolvedLoadingFallback | undefined {
  const component = match.route.route.loading;

  if (component === undefined) {
    return undefined;
  }

  return { component, match };
}

function resolveLayoutLoading(match: MatchedRoute): ResolvedLoadingFallback | undefined {
  const component = match.route.route.layout?.loading;

  if (component === undefined) {
    return undefined;
  }

  return { component, match };
}

function resolveRouteErrorFallback(match: MatchedRoute): ResolvedErrorFallback | undefined {
  const component = match.route.route.error;

  if (component === undefined) {
    return undefined;
  }

  return { component, match };
}

function resolveLayoutErrorFallback(match: MatchedRoute): ResolvedErrorFallback | undefined {
  const component = match.route.route.layout?.error;

  if (component === undefined) {
    return undefined;
  }

  return { component, match };
}

interface MemoizedRouteLoadingFallbackProps {
  readonly fallback?: ResolvedLoadingFallback | undefined;
  readonly globalFallback?: ReactNode | undefined;
}

const MemoizedRouteLoadingFallback = memo(
  function MemoizedRouteLoadingFallback(
    props: MemoizedRouteLoadingFallbackProps,
  ): ReactElement | null {
    return renderLoadingFallback(props.fallback, props.globalFallback) as ReactElement | null;
  },
  (previousProps, nextProps) =>
    previousProps.fallback?.component === nextProps.fallback?.component &&
    previousProps.fallback?.match.id === nextProps.fallback?.match.id &&
    previousProps.globalFallback === nextProps.globalFallback,
);

function renderLoadingFallback(
  loadingFallback: ResolvedLoadingFallback | undefined,
  globalFallback: ReactNode | undefined,
): ReactNode {
  if (!loadingFallback) {
    return globalFallback === undefined ? null : <>{globalFallback}</>;
  }

  const Loading = asComponent<RouteLoadingFallbackProps>(loadingFallback.component);

  if (!Loading) {
    return null;
  }

  return (
    <RouteRenderContext.Provider value={{ match: loadingFallback.match }}>
      <OutletRenderContext.Provider value={{ outlet: null }}>
        <Loading route={loadingFallback.match} />
      </OutletRenderContext.Provider>
    </RouteRenderContext.Provider>
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
