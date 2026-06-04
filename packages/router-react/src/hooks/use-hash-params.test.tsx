import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useHash, useHashParams } from './use-hash-params';

function Page() {
  return null;
}

describe('useHashParams', () => {
  it('returns current URLKit-parsed hash without the leading marker', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          hash: ['profile', 'settings', 'bio', 'top'],
          component: Page,
        },
      ] as const),
      initialEntries: ['/users/42#profile'],
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHashParams('user'), { wrapper });

    expect(result.current).toBe('profile');
    expectTypeOf(result.current).toEqualTypeOf<'profile' | 'settings' | 'bio' | 'top' | null>();
  });

  it('returns URLKit-parsed hash through the useHash alias', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          hash: ['profile', 'settings'],
          component: Page,
        },
      ] as const),
      initialEntries: ['/users/42#settings'],
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHash('user'), { wrapper });

    expect(result.current).toBe('settings');
  });

  it('returns null without a hash', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/page', component: Page }] as const),
      initialEntries: ['/page'],
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHashParams(), { wrapper });

    expect(result.current).toBeNull();
  });
});
