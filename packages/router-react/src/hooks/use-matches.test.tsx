import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { Outlet } from '../outlets/outlet';
import { RouterProvider } from '../provider/router-provider';
import { useMatches } from './use-matches';

function Layout() {
  return <Outlet />;
}
function Page() {
  return null;
}

describe('useMatches', () => {
  it('returns current route branch', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          layout: { view: Layout },
          children: [{ id: 'child', index: true, view: Page }],
        },
      ] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useMatches(), { wrapper });

    expect(result.current.map((match) => match.id)).toEqual(['root', 'child']);
  });
});
