import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useHashParams } from './use-hash-params';

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
          hash: { type: 'enum', values: ['profile', 'settings', 'bio', 'top'], optional: true },
          view: Page,
        },
      ] as const),
      initialEntries: ['/users/42#profile'],
    });
    await router.start();
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
          hash: { type: 'enum', values: ['profile', 'settings'], optional: true },
          view: Page,
        },
      ] as const),
      initialEntries: ['/users/42#settings'],
    });
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHashParams('user'), { wrapper });

    expect(result.current).toBe('settings');
  });

  it('returns null without a hash', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/page', view: Page }] as const),
      initialEntries: ['/page'],
    });
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useHashParams(), { wrapper });

    expect(result.current).toBeNull();
  });

  it('does not accept hook-level URL options', () => {
    if (false) {
      // @ts-expect-error useHashParams reads already-resolved router state.
      useHashParams('user', { url: { invalidHash: 'error' } });
    }
  });
});
