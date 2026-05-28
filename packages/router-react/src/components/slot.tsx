import type { ReactElement } from 'react';
import { getResolvedSlot } from '@cookbook/router';
import type { MatchedRoute, ResolvedSlot, ResolvedInterceptedRoute } from '@cookbook/router';
import {
  OutletContext,
  OutletRenderContext,
  RouteRenderContext,
  useRouterContext,
  useSlotRenderContext,
} from '../context/router-context';
import { asComponent, renderMatches, renderRouteBoundary } from './router-provider';
import type { RenderMatchesOptions } from './router-provider';

export interface SlotProps<T = unknown> {
  readonly name: string;
  readonly context?: T;
}

export function Slot<T = unknown>(props: SlotProps<T>): ReactElement | null {
  const value = useSlotRenderContext();
  const routerContext = useRouterContext();

  if (!value) {
    return null;
  }

  const intercepted = getActiveIntercept(
    routerContext.state.match?.intercepted,
    props.name,
    value.ownerRouteId,
  );

  if (intercepted) {
    return renderInterceptedRoute(
      intercepted,
      intercepted.context ?? props.context,
      value.renderOptions ?? {},
    );
  }

  const slot = getResolvedSlot(value.slots, value.ownerRouteId, props.name);

  if (!slot) {
    return null;
  }

  return renderResolvedSlot(slot, props.context, value.renderOptions ?? {});
}

function renderInterceptedRoute(
  intercepted: ResolvedInterceptedRoute,
  context: unknown,
  options: RenderMatchesOptions = {},
): ReactElement | null {
  const Component = asComponent(intercepted.component);

  if (!Component) {
    return null;
  }

  const match = intercepted.match.branch[intercepted.match.branch.length - 1];

  if (!match) {
    return null;
  }

  const element = renderRouteBoundary(match, <Component />, options);

  return (
    <RouteRenderContext.Provider value={{ match }}>
      <OutletContext.Provider value={{ context }}>
        <OutletRenderContext.Provider value={{ outlet: null }}>
          {element}
        </OutletRenderContext.Provider>
      </OutletContext.Provider>
    </RouteRenderContext.Provider>
  );
}

function renderResolvedSlot(
  slot: ResolvedSlot,
  context: unknown,
  options: RenderMatchesOptions,
): ReactElement | null {
  if (slot.status === 'disabled' || slot.status === 'empty') {
    return null;
  }

  if (slot.status === 'matched' && slot.branch) {
    const rendered = renderMatches(slot.branch, null, {}, options);
    return <OutletContext.Provider value={{ context }}>{rendered}</OutletContext.Provider>;
  }

  const Component = asComponent(slot.component);

  if (!Component) {
    return null;
  }

  const match = createSlotRenderMatch(slot);
  const element = match ? renderRouteBoundary(match, <Component />, options) : <Component />;

  if (!match) {
    return (
      <OutletContext.Provider value={{ context }}>
        <OutletRenderContext.Provider value={{ outlet: null }}>
          {element}
        </OutletRenderContext.Provider>
      </OutletContext.Provider>
    );
  }

  return (
    <RouteRenderContext.Provider value={{ match }}>
      <OutletContext.Provider value={{ context }}>
        <OutletRenderContext.Provider value={{ outlet: null }}>
          {element}
        </OutletRenderContext.Provider>
      </OutletContext.Provider>
    </RouteRenderContext.Provider>
  );
}

function getActiveIntercept(
  intercepted: ResolvedInterceptedRoute | undefined,
  slotName: string,
  ownerRouteId: string,
): ResolvedInterceptedRoute | null {
  if (!intercepted || intercepted.slot !== slotName) {
    return null;
  }

  return intercepted.sourceRouteId === ownerRouteId ? intercepted : null;
}

function createSlotRenderMatch(slot: ResolvedSlot): MatchedRoute | null {
  if (slot.match) {
    return slot.match;
  }

  if (!slot.fallback) {
    return null;
  }

  const fallbackId = `${slot.ownerRouteId}.${slot.name}`;

  return {
    id: fallbackId,
    route: {
      id: fallbackId,
      children: [],
      component: slot.fallback.component,
      params: [],
      index: false,
      score: 0,
      order: -1,
      route: {
        id: fallbackId,
        component: slot.fallback.component,
        ...(slot.fallback.meta === undefined ? {} : { meta: slot.fallback.meta }),
      },
      slotOwnerId: slot.ownerRouteId,
      slotName: slot.name,
      slotRoute: true,
      intercepts: [],
    },
    params: slot.params,
  };
}
