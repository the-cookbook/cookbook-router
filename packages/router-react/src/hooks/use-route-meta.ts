import {
  getActiveRouteMetaChain,
  getRouteMetaChain,
  mergeRouteMetaChain,
  type RegisteredRouteMeta,
  type NormalizedRoute,
  type RouteId,
  type RouteMatch,
  type RouteMetaEntry,
  type RouteMetaMergeInput,
} from '@cookbook/router';
import { useRouteRenderContext, useRouterContext } from '../provider/router-context';

export interface UseRouteMetaOptions {
  /** Include metadata from parent routes. Defaults to false. */
  readonly includeAncestors?: boolean;
  /**
   * Controls metadata composition.
   *
   * - undefined: returns a merged metadata object
   * - false: returns ordered metadata objects without merging
   * - string: returns a merged object using that strategy as the default merge mode
   * - object: returns a merged object using custom merge behavior
   */
  readonly merge?: false | RouteMetaMergeInput;
}

export function useRouteMeta(): RegisteredRouteMeta<RouteId>;
export function useRouteMeta(
  options: UseRouteMetaOptions & { readonly merge?: undefined | RouteMetaMergeInput },
): RegisteredRouteMeta<RouteId>;
export function useRouteMeta(
  options: UseRouteMetaOptions & { readonly merge: false },
): readonly RegisteredRouteMeta<string>[];
export function useRouteMeta<Route extends string>(routeId: Route): RegisteredRouteMeta<Route>;
export function useRouteMeta<Route extends string>(
  routeId: Route,
  options: UseRouteMetaOptions & { readonly merge?: undefined | RouteMetaMergeInput },
): RegisteredRouteMeta<Route>;
export function useRouteMeta<Route extends string>(
  routeId: Route,
  options: UseRouteMetaOptions & { readonly merge: false },
): readonly RegisteredRouteMeta<Route>[];
export function useRouteMeta<Route extends string>(
  routeOrOptions?: Route | UseRouteMetaOptions,
  maybeOptions?: UseRouteMetaOptions,
):
  | RegisteredRouteMeta<Route>
  | RegisteredRouteMeta<RouteId>
  | readonly RegisteredRouteMeta<Route>[] {
  const { router, state } = useRouterContext();
  const localMatch = useRouteRenderContext()?.match;
  const routeId = typeof routeOrOptions === 'string' ? routeOrOptions : undefined;
  const options = typeof routeOrOptions === 'string' ? maybeOptions : routeOrOptions;
  const includeAncestors = options?.includeAncestors === true;
  const chain = routeId
    ? getTargetRouteMetaChain(router.routes, state.match, routeId, includeAncestors)
    : getImplicitRouteMetaChain(state.match, localMatch, includeAncestors);

  if (options?.merge === false) {
    return chain.map((entry) => entry.meta as RegisteredRouteMeta<Route>);
  }

  return mergeRouteMetaChain(chain, options?.merge) as RegisteredRouteMeta<Route>;
}

function getTargetRouteMetaChain<Route extends string>(
  routes: readonly NormalizedRoute[],
  activeMatch: RouteMatch | null,
  routeId: Route,
  includeAncestors: boolean,
): readonly RouteMetaEntry<Route>[] {
  const activeRouteIndex = activeMatch?.branch.findIndex((entry) => entry.id === routeId) ?? -1;

  if (activeMatch && activeRouteIndex >= 0) {
    const branch = includeAncestors
      ? activeMatch.branch.slice(0, activeRouteIndex + 1)
      : activeMatch.branch.slice(activeRouteIndex, activeRouteIndex + 1);

    return branch.map((entry) => ({
      id: entry.id as Route,
      params: entry.params as RouteMetaEntry<Route>['params'],
      meta: (entry.route.meta ?? {}) as RouteMetaEntry<Route>['meta'],
      route: entry.route,
      match: entry,
    }));
  }

  return getRouteMetaChain(routes, routeId, { includeAncestors });
}

function getImplicitRouteMetaChain(
  activeMatch: RouteMatch | null,
  localMatch: RouteMetaEntry['match'] | undefined,
  includeAncestors: boolean,
): readonly RouteMetaEntry<string>[] {
  if (includeAncestors || !localMatch) {
    return getActiveRouteMetaChain(activeMatch, { includeAncestors });
  }

  return [
    {
      id: localMatch.id,
      params: localMatch.params,
      meta: localMatch.route.meta ?? {},
      route: localMatch.route,
      match: localMatch,
    },
  ];
}
