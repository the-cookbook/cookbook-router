import { createContext, useContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { MatchedRoute, ResolvedSlots, Router, RouterState } from '@cookbook/router';
import { createMissingProviderError } from '@cookbook/router';
import type { RenderMatchesOptions } from '../components/router-provider';

export interface RouterContextValue {
  readonly router: Router;
  readonly state: RouterState;
}

export interface OutletContextValue {
  readonly context?: unknown;
}

export interface OutletRenderContextValue {
  readonly outlet: ReactNode;
}

export interface RouteRenderContextValue {
  readonly match: MatchedRoute;
}

export interface RouterErrorFallbackProps {
  readonly error: unknown;
  readonly reset: () => void;
  readonly route?: MatchedRoute;
}

export interface RenderBoundaryOptions {
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
}

export interface SlotRenderContextValue {
  readonly ownerRouteId: string;
  readonly slots: ResolvedSlots;
  readonly renderOptions?: RenderMatchesOptions;
}

export const RouterContext = createContext<RouterContextValue | null>(null);
export const OutletContext = createContext<OutletContextValue | null>(null);
export const OutletRenderContext = createContext<OutletRenderContextValue | null>(null);
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

export function useOutletRenderContextValue(): OutletRenderContextValue | null {
  return useContext(OutletRenderContext);
}

export function useRouteRenderContext(): RouteRenderContextValue | null {
  return useContext(RouteRenderContext);
}

export function useSlotRenderContext(): SlotRenderContextValue | null {
  return useContext(SlotRenderContext);
}
