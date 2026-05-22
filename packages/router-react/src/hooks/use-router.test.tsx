import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useRouter } from './use-router';

function Page() {
  return null;
}

describe('useRouter', () => {
  test('returns the router instance inside a provider', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', component: Page }] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouter(), { wrapper });

    expect(result.current).toBe(router);
  });

  test('throws outside a provider', () => {
    expect(() => renderHook(() => useRouter())).toThrow(
      'Cookbook Router hooks must be used inside <RouterProvider> or <StaticRouterProvider>.',
    );
  });
});
