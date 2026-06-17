import type { ComponentType } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RouterScrollBehavior, SlotErrorFallback, SlotErrorFallbackProps } from './index';

describe('package entrypoint', () => {
  it('exports React integration APIs', async () => {
    const module = await import('./index');

    expect(module.RouterProvider).toBeTypeOf('function');
    expect(module.renderReactRouteMatch).toBeTypeOf('function');
    expect(module.renderRouteBoundary).toBeTypeOf('function');
    expect(module.StaticRouterProvider).toBeTypeOf('function');
    expect(module.Link).toBeTypeOf('function');
    expect(module.NavLink).toBeTypeOf('function');
    expect(module.lazyRouteView).toBeTypeOf('function');
    expect(module.Outlet).toBeTypeOf('function');
    expect(module.Slot).toBeTypeOf('function');
    expect(module.useNavigate).toBeTypeOf('function');
    expect(module.useHashParams).toBeTypeOf('function');
    expect(module.useSearchParams).toBeTypeOf('function');
    expect(module.useUnknownSearchParams).toBeTypeOf('function');
    expect(module.useRouteMeta).toBeTypeOf('function');
  });

  it('keeps focused public types available from the package root', () => {
    expectTypeOf<RouterScrollBehavior>().toEqualTypeOf<ScrollBehavior>();
    expectTypeOf<SlotErrorFallback>().toEqualTypeOf<ComponentType<SlotErrorFallbackProps> | null>();
  });
});
