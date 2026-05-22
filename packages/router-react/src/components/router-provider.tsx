import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type {
  MatchedRoute,
  ResolvedSlots,
  RouteComponent,
  Router,
  RouterState,
} from '@cookbook/router';
import {
  OutletContext,
  RouteRenderContext,
  RouterContext,
  SlotRenderContext,
} from '../context/router-context';

export interface RouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly scrollRestoration?: boolean;
}

export function RouterProvider(props: RouterProviderProps): ReactElement {
  const state = useRouterState(props.router);
  const redirecting = state.error === undefined && isRedirectMatch(state);

  useEffect(() => {
    if (!redirecting) {
      return;
    }

    void props.router.resolveCurrent();
  }, [props.router, redirecting, state.location.href]);
  const activeMatch =
    state.match?.intercepted && state.previousLocation
      ? props.router.match(state.previousLocation.pathname)
      : state.match;
  const rendered = redirecting
    ? null
    : (props.children ??
      renderMatches(activeMatch?.branch ?? [], props.fallback ?? null, activeMatch?.slots ?? {}));
  const contextValue = useMemo(() => ({ router: props.router, state }), [props.router, state]);

  return <RouterContext.Provider value={contextValue}>{rendered}</RouterContext.Provider>;
}

export function useRouterState(router: Router): RouterState {
  return useSyncExternalStore(
    router.subscribe,
    () => router.state,
    () => router.state,
  );
}

export function renderMatches(
  matches: readonly MatchedRoute[],
  fallback: ReactNode,
  slots: ResolvedSlots = {},
): ReactNode {
  if (!matches.length) {
    return fallback;
  }

  return renderMatchAt(matches, 0, fallback, slots);
}

function renderMatchAt(
  matches: readonly MatchedRoute[],
  index: number,
  fallback: ReactNode,
  slots: ResolvedSlots,
): ReactNode {
  const match = matches[index];

  if (!match) {
    return fallback;
  }

  const child = renderMatchAt(matches, index + 1, fallback, slots);
  const routeElement = renderRouteElement(match, child);
  const layoutElement = renderLayoutElement(match, routeElement, slots);

  return (
    <RouteRenderContext.Provider value={{ match }}>{layoutElement}</RouteRenderContext.Provider>
  );
}

function renderRouteElement(match: MatchedRoute, child: ReactNode): ReactNode {
  const Component = asComponent(match.route.component);
  return Component ? <Component /> : child;
}

function renderLayoutElement(
  match: MatchedRoute,
  outlet: ReactNode,
  slots: ResolvedSlots,
): ReactNode {
  const Layout = asComponent(match.route.layout?.component);

  if (!Layout) {
    return outlet;
  }

  return (
    <RouteRenderContext.Provider value={{ match }}>
      <SlotRenderContext.Provider value={{ ownerRouteId: match.id, slots }}>
        <OutletContext.Provider value={{ outlet }}>
          <Layout />
        </OutletContext.Provider>
      </SlotRenderContext.Provider>
    </RouteRenderContext.Provider>
  );
}

export function asComponent(component: RouteComponent | undefined): ComponentType | null {
  return typeof component === 'function' ? (component as ComponentType) : null;
}

function isRedirectMatch(state: RouterState): boolean {
  return state.match?.branch.some((match) => match.route.route.redirect !== undefined) === true;
}
