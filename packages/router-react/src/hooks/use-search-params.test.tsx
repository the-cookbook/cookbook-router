import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useSearch, useSearchParams } from './use-search-params';

function Page() {
  return null;
}

describe('useSearchParams', () => {
  it('returns typed search values for current search string', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/page', component: Page }] as const),
      initialEntries: ['/page?tab=settings&empty='],
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useSearchParams('user'), { wrapper });

    expect(result.current.tab).toBe('settings');
    expect(result.current.empty).toBe('');
    expectTypeOf(result.current.tab).toEqualTypeOf<string | undefined>();
  });

  it('returns URLKit-parsed search values from the current match', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: {
            page: { value: 'int', default: 1 },
            tags: { value: 'string', type: 'many', optional: true },
          },
          component: Page,
        },
      ] as const),
      initialEntries: ['/products?page=2&tags=router&tags=typescript'],
      url: { arrayFormat: 'repeat' },
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useSearch('products'), { wrapper });

    expect(result.current).toEqual({ page: 2, tags: ['router', 'typescript'] });
  });

  it('uses route-level URL options over router-level arrayFormat', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { tags: { value: 'string', type: 'many', optional: true } },
          url: { arrayFormat: 'comma' },
          component: Page,
        },
      ] as const),
      initialEntries: ['/products?tags=router,typescript'],
      url: { arrayFormat: 'repeat' },
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useSearchParams('products'), { wrapper });

    expect(result.current).toEqual({ tags: ['router', 'typescript'] });
  });

  it('does not accept hook-level URL options', () => {
    if (false) {
      // @ts-expect-error useSearchParams reads already-resolved router state.
      useSearchParams('products', { url: { arrayFormat: 'repeat' } });
    }
  });
});
