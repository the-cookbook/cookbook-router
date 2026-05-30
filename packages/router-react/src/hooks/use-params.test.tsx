import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, expectTypeOf } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useParams } from './use-params';

function Page() {
  return null;
}

describe('useParams', () => {
  it('returns params for the active route', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', component: Page }] as const),
      initialEntries: ['/users/42'],
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useParams('user'), { wrapper });

    expect(result.current).toEqual({ id: '42' });
    expectTypeOf(result.current.id).toEqualTypeOf<number>();
  });

  it('infers params for slot route IDs', () => {
    expectTypeOf(
      null as unknown as ReturnType<typeof useParams<'dashboard.sidebar.activity'>>,
    ).toEqualTypeOf<{ id: number }>();
  });
});
