import { Component, Suspense, memo } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { renderRouteMatch } from '@cookbook/router';
import type {
  MatchedRoute,
  ResolvedRouteFallback,
  RouteBoundaryViewContext,
  RouteErrorViewContext,
  RouteInterceptViewContext,
  RouteMatch,
  RouteSlotViewContext,
  RouteView,
  RouteViewContext,
} from '@cookbook/router';
import {
  OutletContext,
  OutletRenderContext,
  RouteRenderContext,
  SlotErrorIsolationContext,
  SlotRenderContext,
} from './router-context';
import type { RenderBoundaryOptions } from './router-context';

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
export interface RenderReactRouteMatchOptions extends RenderBoundaryOptions {
  /** Router state error to surface through the active route error boundary. */
  readonly error?: unknown;
}

/** Concrete loading fallback selected for a matched route boundary. */
export interface ResolvedLoadingFallback {
  readonly view: RouteView;
  readonly match: MatchedRoute;
}

/** Concrete error fallback selected for a matched route boundary. */
export interface ResolvedErrorFallback {
  readonly view: RouteView;
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
  readonly isolateSlotErrors?: boolean;
  readonly children: ReactNode;
}

interface RouteErrorBoundaryState {
  readonly error: unknown | undefined;
}

/**
 * Renders a resolved route match with React-specific view conversion,
 * contexts, Suspense, and error boundaries.
 */
export function renderReactRouteMatch(
  match: RouteMatch | null | undefined,
  fallback: ReactNode,
  options: RenderReactRouteMatchOptions = {},
): ReactNode {
  const rendered = renderRouteMatch<RouteView, ReactNode>(match, {
    ...(options.error === undefined ? {} : { error: options.error }),
    fallback,
    renderView(view, context) {
      return renderRouteView(view, context);
    },
    renderLayout(view, context) {
      return renderLayoutView(view, context, options);
    },
    renderSlot(view, context) {
      return renderSlotView(view, context);
    },
    renderIntercept(view, context) {
      return renderInterceptView(view, context);
    },
    renderError(view, context) {
      return renderRouteStateErrorFallback(view, context, options);
    },
    renderBoundary(outlet, context) {
      return renderCoreRouteBoundary(outlet, context, options);
    },
    renderEmpty(context) {
      if (options.error !== undefined && context.match && options.errorFallback) {
        const ErrorFallback = options.errorFallback;
        return (
          <ErrorFallback error={options.error} reset={() => undefined} route={context.match} />
        );
      }

      if (context.reason === 'not-found' && context.slot === undefined) {
        return fallback;
      }

      return null;
    },
  });

  return <Suspense fallback={options.loadingFallback ?? null}>{rendered}</Suspense>;
}

function renderRouteView(view: RouteView, context: RouteViewContext<ReactNode>): ReactNode {
  const View = asReactView(view);

  if (!View) {
    return context.outlet;
  }

  return (
    <RouteRenderContext.Provider value={{ match: context.match }}>
      <OutletRenderContext.Provider value={{ outlet: context.outlet }}>
        <View />
      </OutletRenderContext.Provider>
    </RouteRenderContext.Provider>
  );
}

function renderLayoutView(
  view: RouteView,
  context: RouteViewContext<ReactNode> & { readonly ownerRouteId: string },
  options: RenderReactRouteMatchOptions,
): ReactNode {
  const Layout = asReactView(view);

  if (!Layout) {
    return context.outlet;
  }

  return (
    <RouteRenderContext.Provider value={{ match: context.match }}>
      <SlotRenderContext.Provider
        value={{
          ownerRouteId: context.ownerRouteId,
          slots: context.slots,
          renderOptions: options,
        }}
      >
        <OutletRenderContext.Provider value={{ outlet: context.outlet }}>
          <Layout />
        </OutletRenderContext.Provider>
      </SlotRenderContext.Provider>
    </RouteRenderContext.Provider>
  );
}

function renderSlotView(view: RouteView, context: RouteSlotViewContext<ReactNode>): ReactNode {
  const SlotView = asReactView(view);

  if (!SlotView) {
    return null;
  }

  return (
    <RouteRenderContext.Provider value={{ match: context.match }}>
      <OutletRenderContext.Provider value={{ outlet: context.outlet }}>
        <SlotView />
      </OutletRenderContext.Provider>
    </RouteRenderContext.Provider>
  );
}

function renderInterceptView(
  view: RouteView,
  context: RouteInterceptViewContext<ReactNode>,
): ReactNode {
  const InterceptView = asReactView(view);

  if (!InterceptView) {
    return null;
  }

  const element = (
    <RouteRenderContext.Provider value={{ match: context.match }}>
      <OutletRenderContext.Provider value={{ outlet: context.outlet }}>
        <InterceptView />
      </OutletRenderContext.Provider>
    </RouteRenderContext.Provider>
  );

  if (context.context === undefined) {
    return element;
  }

  return (
    <OutletContext.Provider value={{ context: context.context }}>{element}</OutletContext.Provider>
  );
}

function renderRouteStateErrorFallback(
  view: RouteView,
  context: RouteErrorViewContext<ReactNode>,
  options: RenderReactRouteMatchOptions,
): ReactNode {
  const ErrorFallback = asReactView<RouteErrorFallbackProps>(view) ?? options.errorFallback;

  if (!ErrorFallback) {
    return null;
  }

  return (
    <RouteRenderContext.Provider value={{ match: context.match }}>
      <ErrorFallback error={context.error} reset={() => undefined} route={context.match} />
    </RouteRenderContext.Provider>
  );
}

function renderCoreRouteBoundary(
  element: ReactNode,
  context: RouteBoundaryViewContext<RouteView, ReactNode>,
  options: RenderReactRouteMatchOptions,
): ReactNode {
  const fallbacks: InheritedRouteFallbacks = {
    ...(context.loading === undefined ? {} : { loading: toReactLoadingFallback(context.loading) }),
    ...(context.error === undefined ? {} : { error: toReactErrorFallback(context.error) }),
  };
  const boundaryOptions =
    context.isLeaf || fallbacks.error ? options : omitGlobalErrorFallback(options);

  return renderRouteBoundary(context.match, element, boundaryOptions, fallbacks);
}

function toReactLoadingFallback(
  fallback: ResolvedRouteFallback<RouteView>,
): ResolvedLoadingFallback {
  return { view: fallback.view, match: fallback.match };
}

function toReactErrorFallback(fallback: ResolvedRouteFallback<RouteView>): ResolvedErrorFallback {
  return { view: fallback.view, match: fallback.match };
}

export function renderRouteBoundary(
  match: MatchedRoute,
  element: ReactNode,
  options: RenderReactRouteMatchOptions = {},
  fallbacks?: InheritedRouteFallbacks,
): ReactNode {
  const resolvedFallbacks = fallbacks ?? {};
  const ErrorFallback = asReactView<RouteErrorFallbackProps>(resolvedFallbacks.error?.view);

  return (
    <SlotErrorIsolationContext.Consumer>
      {(slotErrorIsolation) => (
        <RouteErrorBoundary
          match={resolvedFallbacks.error?.match ?? match}
          {...(ErrorFallback ? { fallback: ErrorFallback } : {})}
          {...(options.errorFallback ? { globalFallback: options.errorFallback } : {})}
          {...(slotErrorIsolation ? { isolateSlotErrors: true } : {})}
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
      )}
    </SlotErrorIsolationContext.Consumer>
  );
}

function omitGlobalErrorFallback(
  options: RenderReactRouteMatchOptions,
): RenderReactRouteMatchOptions {
  if (options.errorFallback === undefined) {
    return options;
  }

  return {
    ...(options.loadingFallback === undefined ? {} : { loadingFallback: options.loadingFallback }),
  };
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
    previousProps.fallback?.view === nextProps.fallback?.view &&
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

  const Loading = asReactView<RouteLoadingFallbackProps>(loadingFallback.view);

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
      if (this.props.isolateSlotErrors) {
        throw this.state.error;
      }

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

export function asReactView<Props = Record<string, never>>(
  view: RouteView | undefined,
): ComponentType<Props> | null {
  if (typeof view === 'function') {
    return view as ComponentType<Props>;
  }

  if (typeof view === 'object' && view !== null && '$$typeof' in view) {
    return view as ComponentType<Props>;
  }

  return null;
}
