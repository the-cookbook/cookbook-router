import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useHref } from './use-href';

function Page() {
  return null;
}

describe('useHref', () => {
  it('generates href through the router', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', component: Page }] as const),
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
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', component: Page }] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHref({ route: 'user', params: { id: 4 } }), { wrapper });

    expect(result.current).toBe('/users/4');
  });
});
