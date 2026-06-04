import type { MatchOptions, RouteId, RouteSearch } from '@cookbook/router';
import { useRouterContext } from '../context/router-context';

/** Options for reading URLKit-parsed search state from the active route. */
export interface UseSearchParamsOptions {
  /** Per-hook URLKit options overriding route-level and router-level defaults. */
  readonly url?: MatchOptions['url'];
}

/**
 * Returns URLKit-parsed search values for the current match.
 *
 * Passing a route id narrows the result through generated search contracts.
 * Per-hook `url` options override route-level and router-level URL defaults for
 * this read without changing router state.
 */
export function useSearchParams<Route extends RouteId>(
  routeId: Route,
  options?: UseSearchParamsOptions,
): RouteSearch<Route>;
export function useSearchParams(options?: UseSearchParamsOptions): RouteSearch<RouteId>;
export function useSearchParams<Route extends RouteId>(
  routeOrOptions?: Route | UseSearchParamsOptions,
  options?: UseSearchParamsOptions,
): RouteSearch<Route> | RouteSearch<RouteId> {
  const { router, state } = useRouterContext();
  const routeId = typeof routeOrOptions === 'string' ? routeOrOptions : undefined;
  const hookOptions = typeof routeOrOptions === 'string' ? options : routeOrOptions;
  const match =
    hookOptions?.url === undefined
      ? state.match
      : router.match(state.location.href, { url: hookOptions.url });

  if (!match) {
    return {} as RouteSearch<Route>;
  }

  if (routeId && !match.branch.some((entry) => entry.id === routeId)) {
    return {} as RouteSearch<Route>;
  }

  return match.search as RouteSearch<Route>;
}

/** Alias for `useSearchParams`. */
export const useSearch = useSearchParams;
