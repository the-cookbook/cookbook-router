import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { MatchedRoute, ResolvedSlots, Router, RouterState } from '@cookbook/router';
import { createMissingProviderError } from '@cookbook/router';

export interface RouterContextValue {
  readonly router: Router;
  readonly state: RouterState;
}

export interface OutletContextValue {
  readonly outlet: ReactNode;
  readonly context?: unknown;
}

export interface RouteRenderContextValue {
  readonly match: MatchedRoute;
}

export interface SlotRenderContextValue {
  readonly ownerRouteId: string;
  readonly slots: ResolvedSlots;
}

export const RouterContext = createContext<RouterContextValue | null>(null);
export const OutletContext = createContext<OutletContextValue | null>(null);
export const RouteRenderContext = createContext<RouteRenderContextValue | null>(null);
export const SlotRenderContext = createContext<SlotRenderContextValue | null>(null);

export function useRouterContext(): RouterContextValue {
  const value = useContext(RouterContext);

  if (!value) {
    throw createMissingProviderError('Cookbook Router hooks');
  }

  return value;
}

export function useOutletContextValue(): OutletContextValue | null {
  return useContext(OutletContext);
}

export function useRouteRenderContext(): RouteRenderContextValue | null {
  return useContext(RouteRenderContext);
}

export function useSlotRenderContext(): SlotRenderContextValue | null {
  return useContext(SlotRenderContext);
}
