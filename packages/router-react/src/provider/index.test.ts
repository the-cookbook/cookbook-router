import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  OutletContextValue,
  RenderReactRouteMatchOptions,
  RouteErrorFallbackProps,
  RouteLoadingFallbackProps,
  RouteRenderContextValue,
  RouterContextValue,
  RouterErrorFallbackProps,
  RouterProviderProps,
  RouterScrollBehavior,
  SlotRenderContextValue,
  StaticRouterProviderProps,
} from './index';

describe('provider entrypoint', () => {
  it('exports the complete public provider surface without unrelated values', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual([
      'OutletContext',
      'RouteRenderContext',
      'RouterContext',
      'RouterProvider',
      'SlotRenderContext',
      'StaticRouterProvider',
      'renderReactRouteMatch',
      'renderRouteBoundary',
      'useRouterContext',
      'useRouterState',
    ]);
  });

  it('exports every public provider and context type', () => {
    expectTypeOf<RouterProviderProps>().toHaveProperty('router');
    expectTypeOf<RouterProviderProps>().toHaveProperty('autoStart');
    expectTypeOf<RouterProviderProps>().toHaveProperty('middleware');
    expectTypeOf<StaticRouterProviderProps>().toHaveProperty('router');
    expectTypeOf<StaticRouterProviderProps>().toHaveProperty('middleware');
    expectTypeOf<RouterScrollBehavior>().toEqualTypeOf<ScrollBehavior>();
    expectTypeOf<RenderReactRouteMatchOptions>().toHaveProperty('error');
    expectTypeOf<RouteLoadingFallbackProps>().toHaveProperty('route');
    expectTypeOf<RouteErrorFallbackProps>().toHaveProperty('reset');
    expectTypeOf<RouterErrorFallbackProps>().toHaveProperty('route');
    expectTypeOf<RouterContextValue>().toHaveProperty('router');
    expectTypeOf<RouterContextValue>().toHaveProperty('state');
    expectTypeOf<OutletContextValue>().toHaveProperty('context');
    expectTypeOf<RouteRenderContextValue>().toHaveProperty('match');
    expectTypeOf<SlotRenderContextValue>().toHaveProperty('slots');
  });
});
