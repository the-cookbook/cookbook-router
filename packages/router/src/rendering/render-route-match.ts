import type { MatchedRoute, ResolvedSlot, RouteMatch, RouteView } from '../route-config/contracts';
import type {
  InheritedViewFallbacks,
  RenderBranchInput,
  RenderRouteMatchOptions,
  RouteBoundaryViewContext,
  RouteEmptyViewContext,
  RouteErrorViewContext,
  RouteInterceptViewContext,
  RouteSlotViewContext,
} from './contracts';
import { resolveBoundaryFallbacks, resolveLayoutFallbacks } from './resolve-view-fallbacks';

/**
 * Traverses a resolved route match with renderer-provided callbacks.
 *
 * The core router owns route/layout/outlet/slot/intercept traversal, but does
 * not assume a route view is callable and does not return framework-specific UI.
 */
export function renderRouteMatch<View = RouteView, Output = unknown>(
  match: RouteMatch | null | undefined,
  options: RenderRouteMatchOptions<View, Output>,
): Output {
  if (!match) {
    return renderEmpty(options, { reason: 'not-found' });
  }

  return renderBranch({ branch: match.branch, slots: match.slots, match }, options, {});
}

function renderBranch<View = RouteView, Output = unknown>(
  input: RenderBranchInput,
  options: RenderRouteMatchOptions<View, Output>,
  inheritedFallbacks: InheritedViewFallbacks<View>,
): Output {
  return renderBranchAt(input, options, 0, inheritedFallbacks);
}

function renderBranchAt<View = RouteView, Output = unknown>(
  input: RenderBranchInput,
  options: RenderRouteMatchOptions<View, Output>,
  index: number,
  inheritedFallbacks: InheritedViewFallbacks<View>,
): Output {
  const match = input.branch[index];

  if (!match) {
    return renderEmpty(options, { reason: 'empty-branch' });
  }

  const layoutFallbacks = resolveLayoutFallbacks(match, inheritedFallbacks);
  const outlet = renderBranchAt(input, options, index + 1, layoutFallbacks);
  const isLeafMatch = index === input.branch.length - 1;
  const slots = renderSlots(input, options, match, isLeafMatch);
  const boundaryFallbacks = resolveBoundaryFallbacks(match, layoutFallbacks, isLeafMatch);
  const content =
    isLeafMatch && options.error !== undefined
      ? renderErrorState(options.error, match, outlet, slots, boundaryFallbacks, options)
      : renderRouteView(match, outlet, slots, options);
  const bounded = renderRouteBoundary(
    match,
    content,
    outlet,
    slots,
    boundaryFallbacks,
    isLeafMatch,
    options,
  );

  return renderLayoutView(match, bounded, slots, options);
}

function renderRouteView<View = RouteView, Output = unknown>(
  match: MatchedRoute,
  outlet: Output,
  slots: Readonly<Record<string, Output>>,
  options: RenderRouteMatchOptions<View, Output>,
): Output {
  const view = match.route.view as View | undefined;

  if (view === undefined) {
    return outlet;
  }

  return options.renderView(view, { match, outlet, slots });
}

function renderLayoutView<View = RouteView, Output = unknown>(
  match: MatchedRoute,
  outlet: Output,
  slots: Readonly<Record<string, Output>>,
  options: RenderRouteMatchOptions<View, Output>,
): Output {
  const view = match.route.layout?.view as View | undefined;

  if (view === undefined) {
    return outlet;
  }

  const renderLayout = options.renderLayout ?? options.renderView;
  return renderLayout(view, { match, outlet, slots, ownerRouteId: match.id });
}

function renderRouteBoundary<View = RouteView, Output = unknown>(
  match: MatchedRoute,
  content: Output,
  outlet: Output,
  slots: Readonly<Record<string, Output>>,
  fallbacks: InheritedViewFallbacks<View>,
  isLeaf: boolean,
  options: RenderRouteMatchOptions<View, Output>,
): Output {
  if (!options.renderBoundary) {
    return content;
  }

  const context: RouteBoundaryViewContext<View, Output> = {
    match,
    outlet,
    slots,
    isLeaf,
    ...(fallbacks.loading === undefined ? {} : { loading: fallbacks.loading }),
    ...(fallbacks.error === undefined ? {} : { error: fallbacks.error }),
  };

  return options.renderBoundary(content, context);
}

function renderErrorState<View = RouteView, Output = unknown>(
  error: unknown,
  match: MatchedRoute,
  outlet: Output,
  slots: Readonly<Record<string, Output>>,
  fallbacks: InheritedViewFallbacks<View>,
  options: RenderRouteMatchOptions<View, Output>,
): Output {
  if (!fallbacks.error) {
    return renderEmpty(options, { reason: 'empty-route', match });
  }

  const context: RouteErrorViewContext<Output> = {
    match: fallbacks.error.match,
    outlet,
    slots,
    error,
    source: fallbacks.error.source,
  };
  const renderError = options.renderError ?? options.renderView;
  return renderError(fallbacks.error.view, context);
}

function renderSlots<View = RouteView, Output = unknown>(
  input: RenderBranchInput,
  options: RenderRouteMatchOptions<View, Output>,
  owner: MatchedRoute,
  isLeafMatch: boolean,
): Readonly<Record<string, Output>> {
  const ownerSlots = input.slots[owner.id];

  if (!ownerSlots) {
    return {};
  }

  const rendered: Record<string, Output> = {};

  for (const [slotName, slot] of Object.entries(ownerSlots)) {
    rendered[slotName] = renderSlot(input, options, owner, slotName, slot, isLeafMatch);
  }

  return rendered;
}

function renderSlot<View = RouteView, Output = unknown>(
  input: RenderBranchInput,
  options: RenderRouteMatchOptions<View, Output>,
  owner: MatchedRoute,
  slotName: string,
  slot: ResolvedSlot,
  isLeafMatch: boolean,
): Output {
  const intercepted = input.match?.intercepted;

  if (intercepted?.slot === slotName && intercepted.sourceRouteId === owner.id) {
    return renderIntercept(input, options, slotName, intercepted);
  }

  if (slot.status === 'disabled') {
    return renderEmpty(options, { reason: 'disabled-slot', slot });
  }

  if (slot.status === 'empty') {
    return renderEmpty(options, { reason: 'empty-slot', slot });
  }

  if (slot.status === 'not-found') {
    return renderEmpty(options, { reason: 'not-found', slot });
  }

  if (slot.status === 'matched' && slot.branch) {
    return renderBranch(
      {
        branch: slot.branch,
        slots: {},
        ...(input.match === undefined ? {} : { match: input.match }),
      },
      options,
      {},
    );
  }

  const view = slot.view as View | undefined;

  if (view === undefined) {
    return renderEmpty(options, { reason: isLeafMatch ? 'empty-slot' : 'empty-route', slot });
  }

  const renderSlotView = options.renderSlot ?? options.renderView;
  const match = slot.match ?? createSlotFallbackMatch(owner, slotName, slot);
  const context: RouteSlotViewContext<Output> = {
    match: match ?? owner,
    outlet: options.fallback,
    slots: {},
    ownerRouteId: owner.id,
    name: slotName,
    slot,
    params: slot.params,
  };
  const rendered = renderSlotView(view, context);

  if (!match) {
    return rendered;
  }

  return renderRouteBoundary(
    match,
    rendered,
    options.fallback,
    {},
    resolveBoundaryFallbacks(match, {} as InheritedViewFallbacks<View>, true),
    true,
    options,
  );
}

function createSlotFallbackMatch(
  owner: MatchedRoute,
  slotName: string,
  slot: ResolvedSlot,
): MatchedRoute | null {
  if (!slot.fallback) {
    return null;
  }

  const fallbackId = `${slot.ownerRouteId}.${slot.name}`;

  return {
    id: fallbackId,
    route: {
      id: fallbackId,
      children: [],
      view: slot.fallback.view,
      params: [],
      index: false,
      score: 0,
      pathDepth: 0,
      order: -1,
      route: {
        id: fallbackId,
        view: slot.fallback.view,
        ...(slot.fallback.meta === undefined ? {} : { meta: slot.fallback.meta }),
      },
      slotOwnerId: slot.ownerRouteId,
      slotName,
      slotRoute: true,
      intercepts: [],
    },
    params: owner.params,
  };
}

function renderIntercept<View = RouteView, Output = unknown>(
  input: RenderBranchInput,
  options: RenderRouteMatchOptions<View, Output>,
  slotName: string,
  intercepted: NonNullable<RouteMatch['intercepted']>,
): Output {
  const view = intercepted.view as View;
  const renderInterceptView = options.renderIntercept ?? options.renderView;
  const outlet = renderBranch(
    {
      branch: intercepted.match.branch,
      slots: intercepted.match.slots,
      match: intercepted.match,
    },
    options,
    {},
  );
  const context: RouteInterceptViewContext<Output> = {
    match: intercepted.match.branch[intercepted.match.branch.length - 1] ?? input.branch[0]!,
    outlet,
    slots: {},
    ownerRouteId: intercepted.sourceRouteId,
    name: slotName,
    intercepted,
    ...(intercepted.context === undefined ? {} : { context: intercepted.context }),
  };

  const rendered = renderInterceptView(view, context);

  return renderRouteBoundary(
    context.match,
    rendered,
    outlet,
    {},
    resolveBoundaryFallbacks(context.match, {} as InheritedViewFallbacks<View>, true),
    true,
    options,
  );
}

function renderEmpty<View = RouteView, Output = unknown>(
  options: RenderRouteMatchOptions<View, Output>,
  context: RouteEmptyViewContext,
): Output {
  return options.renderEmpty ? options.renderEmpty(context) : options.fallback;
}
