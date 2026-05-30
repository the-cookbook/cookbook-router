import { createMissingOutletContextError } from '@cookbook/router';
import { useOutletContextValue } from '../context/router-context';
import type { RouteId, RouteOutletContext } from '@cookbook/router';

/** Options for reading outlet context. */
export interface OutletContextOptions {
  readonly strict?: boolean;
}

/**
 * Reads context provided by the nearest `Outlet` or `Slot`.
 *
 * Passing a route id narrows the return type through generated outlet-context
 * contracts. `strict: true` throws when no context is available.
 */
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
