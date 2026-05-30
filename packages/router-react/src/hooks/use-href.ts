import type { HrefOptions, NavigateOptions, RouteId } from '@cookbook/router';
import { useRouter } from './use-router';

/**
 * Generates an href for a route id without navigating.
 *
 * Params, search, and hash are inferred from generated contracts when `Register`
 * is augmented.
 */
export function useHref<Route extends RouteId>(
  routeId: Route,
  options?: HrefOptions<Route>,
): string;
export function useHref<Route extends RouteId>(options: NavigateOptions<Route>): string;
export function useHref<Route extends RouteId>(
  routeOrOptions: Route | NavigateOptions<Route>,
  options?: HrefOptions<Route>,
): string {
  const router = useRouter();

  if (typeof routeOrOptions === 'object') {
    return router.href(routeOrOptions);
  }

  return router.href(routeOrOptions, options);
}
