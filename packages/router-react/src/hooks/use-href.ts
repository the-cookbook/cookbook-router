import type { HrefOptions, NavigateOptions, RouteId } from '@cookbook/router';
import { useRouter } from './use-router';

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
