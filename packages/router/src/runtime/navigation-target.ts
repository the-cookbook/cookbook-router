import type { HrefOptions, NavigateOptions } from './contracts';

export function normalizeNavigateTarget<Route extends string>(
  routeOrOptions: Route | NavigateOptions<Route>,
  options?: HrefOptions<Route>,
): { readonly route: Route; readonly options?: HrefOptions<Route> } {
  if (typeof routeOrOptions === 'object' && routeOrOptions !== null) {
    const { route, ...rest } = routeOrOptions;
    return { route, options: rest as HrefOptions<Route> };
  }

  return { route: routeOrOptions as Route, ...(options === undefined ? {} : { options }) };
}
