import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useRouter } from './use-router';

function Page() {
  return null;
}

describe('useRouter', () => {
  it('returns the router instance inside a provider', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', view: Page }] as const),
    });
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouter(), { wrapper });

    expect(result.current).toBe(router);
  });

  it('throws outside a provider', () => {
    expect(() => renderHook(() => useRouter())).toThrow(
      'Cookbook Router hooks must be used inside <RouterProvider> or <StaticRouterProvider>.',
    );
  });
});
