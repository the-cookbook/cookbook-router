import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useSearchParams } from './use-search-params';

function Page() {
  return null;
}

describe('useSearchParams', () => {
  test('returns typed search values for current search string', async () => {
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
});
