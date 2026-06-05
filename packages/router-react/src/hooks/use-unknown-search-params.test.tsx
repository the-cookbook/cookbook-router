import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useSearchParams } from './use-search-params';
import { useUnknownSearchParams } from './use-unknown-search-params';

function Page() {
  return null;
}

describe('useUnknownSearchParams', () => {
  it('returns URLKit-preserved unknown search params separately from typed search', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: {
            page: { value: 'number', optional: true },
          },
          component: Page,
        },
      ] as const),
      initialEntries: ['/products?page=0&utm_source=website'],
      url: { unknownSearch: 'preserve' },
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const search = renderHook(() => useSearchParams('products'), { wrapper });
    const unknownSearch = renderHook(() => useUnknownSearchParams(), { wrapper });

    expect(search.result.current).toEqual({ page: 0 });
    expect(unknownSearch.result.current).toEqual({ utm_source: 'website' });
  });

  it('returns an empty object when unknown search is stripped or there is no match', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { page: { value: 'number', optional: true } },
          component: Page,
        },
      ] as const),
      initialEntries: ['/products?page=0&utm_source=website'],
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useUnknownSearchParams(), { wrapper });

    expect(result.current).toEqual({});
  });
});
