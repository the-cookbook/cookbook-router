import { describe, expect, it } from 'vitest';

describe('package entrypoint', () => {
  it('exports React integration APIs', async () => {
    const module = await import('./index');

    expect(module.RouterProvider).toBeTypeOf('function');
    expect(module.renderRouteBoundary).toBeTypeOf('function');
    expect(module.StaticRouterProvider).toBeTypeOf('function');
    expect(module.Link).toBeTypeOf('function');
    expect(module.NavLink).toBeTypeOf('function');
    expect(module.Outlet).toBeTypeOf('function');
    expect(module.useNavigate).toBeTypeOf('function');
    expect(module.useHashParams).toBeTypeOf('function');
    expect(module.useHash).toBeTypeOf('function');
    expect(module.useSearchParams).toBeTypeOf('function');
    expect(module.useSearch).toBeTypeOf('function');
  });
});
