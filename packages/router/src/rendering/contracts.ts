import type {
  MatchedRoute,
  ResolvedInterceptedRoute,
  ResolvedSlot,
  ResolvedSlots,
  RouteMatch,
  RouteView,
} from '../route-config/contracts';

/** Options used by the renderer-neutral route match traversal helper. */
export interface RenderRouteMatchOptions<View = RouteView, Output = unknown> {
  readonly error?: unknown;
  readonly fallback: Output;
  readonly renderView: (view: View, context: RouteViewContext<Output>) => Output;
  readonly renderLayout?: (view: View, context: RouteLayoutViewContext<Output>) => Output;
  readonly renderLoading?: (view: View, context: RouteLoadingViewContext<Output>) => Output;
  readonly renderError?: (view: View, context: RouteErrorViewContext<Output>) => Output;
  readonly renderSlot?: (view: View, context: RouteSlotViewContext<Output>) => Output;
  readonly renderIntercept?: (view: View, context: RouteInterceptViewContext<Output>) => Output;
  readonly renderBoundary?: (
    outlet: Output,
    context: RouteBoundaryViewContext<View, Output>,
  ) => Output;
  readonly renderEmpty?: (context: RouteEmptyViewContext) => Output;
}

/** Shared context passed to all route view rendering callbacks. */
export interface RouteViewContext<Output = unknown> {
  readonly match: MatchedRoute;
  readonly outlet: Output;
  readonly slots: Readonly<Record<string, Output>>;
}

/** Context passed when rendering a layout view. */
export interface RouteLayoutViewContext<Output = unknown> extends RouteViewContext<Output> {
  readonly ownerRouteId: string;
}

/** Context passed when rendering a loading fallback view. */
export interface RouteLoadingViewContext<Output = unknown> extends RouteViewContext<Output> {
  readonly source: 'route' | 'layout';
}

/** Context passed when wrapping a rendered route view in a renderer boundary. */
export interface RouteBoundaryViewContext<
  View = RouteView,
  Output = unknown,
> extends RouteViewContext<Output> {
  readonly loading?: ResolvedRouteFallback<View>;
  readonly error?: ResolvedRouteFallback<View>;
  readonly isLeaf: boolean;
}

/** Context passed when rendering an error fallback view. */
export interface RouteErrorViewContext<Output = unknown> extends RouteViewContext<Output> {
  readonly error: unknown;
  readonly source: 'route' | 'layout';
}

/** Context passed when rendering a slot fallback view. */
export interface RouteSlotViewContext<Output = unknown> extends RouteViewContext<Output> {
  readonly ownerRouteId: string;
  readonly name: string;
  readonly slot: ResolvedSlot;
  readonly params: Record<string, unknown>;
}

/** Context passed when rendering an intercepted route view. */
export interface RouteInterceptViewContext<Output = unknown> extends RouteViewContext<Output> {
  readonly ownerRouteId: string;
  readonly name: string;
  readonly intercepted: ResolvedInterceptedRoute;
  readonly context?: unknown;
}

/** Context passed when a branch, slot, or match has no renderable content. */
export interface RouteEmptyViewContext {
  readonly reason: 'empty-branch' | 'empty-route' | 'empty-slot' | 'disabled-slot' | 'not-found';
  readonly match?: MatchedRoute;
  readonly slot?: ResolvedSlot;
}

export interface ResolvedRouteFallback<View = RouteView> {
  readonly view: View;
  readonly match: MatchedRoute;
  readonly source: 'route' | 'layout';
}

export interface InheritedViewFallbacks<View = RouteView> {
  readonly loading?: ResolvedRouteFallback<View>;
  readonly error?: ResolvedRouteFallback<View>;
}

export interface RenderBranchInput {
  readonly branch: readonly MatchedRoute[];
  readonly slots: ResolvedSlots;
  readonly match?: RouteMatch | null;
}
