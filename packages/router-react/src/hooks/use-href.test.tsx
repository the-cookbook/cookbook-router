import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useHref } from './use-href';

function Page() {
  return null;
}

describe('useHref', () => {
  it('generates href through the router', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', view: Page }] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(
      () => useHref('user', { params: { id: 3 }, search: { tab: 'profile' }, hash: '#bio' }),
      { wrapper },
    );

    expect(result.current).toBe('/users/3?tab=profile#bio');
  });

  it('accepts an object target for cleaner call sites', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', view: Page }] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHref({ route: 'user', params: { id: 4 } }), { wrapper });

    expect(result.current).toBe('/users/4');
  });

  it('forwards URL options to href generation', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { tags: { type: 'string', many: true, optional: true } },
          view: Page,
        },
      ] as const),
      url: { arrayFormat: 'repeat' },
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(
      () =>
        useHref('products', {
          search: { tags: ['router', 'typescript'] },
          url: { arrayFormat: 'comma' },
        }),
      { wrapper },
    );

    expect(result.current).toBe('/products?tags=router%2Ctypescript');
  });

  it('forwards default serialization options to href generation', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { page: { type: 'int', default: 1 } },
          view: Page,
        },
      ] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(
      () => useHref('products', { search: { page: 1 }, url: { defaults: 'omit' } }),
      { wrapper },
    );

    expect(result.current).toBe('/products');
  });
});
