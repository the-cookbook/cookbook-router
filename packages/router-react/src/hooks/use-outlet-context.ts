import { createMissingOutletContextError } from '@cookbook/router';
import { useOutletContextValue } from '../context/router-context';
import type { RouteId, RouteOutletContext } from '@cookbook/router';

export interface OutletContextOptions {
  readonly strict?: boolean;
}

export function useOutletContext(): unknown;
export function useOutletContext<Route extends RouteId>(
  routeId: Route,
  options?: OutletContextOptions,
): RouteOutletContext<Route>;
export function useOutletContext<Context>(options?: OutletContextOptions): Context;
export function useOutletContext(
  first?: string | OutletContextOptions,
  second?: OutletContextOptions,
): unknown {
  const value = useOutletContextValue();
  const context = value?.context;
  const options = typeof first === 'string' ? second : first;

  if (options?.strict && context === undefined) {
    throw createMissingOutletContextError(typeof first === 'string' ? first : undefined);
  }

  return context;
}
