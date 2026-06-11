import { renderHook } from '@testing-library/react';
import { createConstraint, createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, expectTypeOf } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useParams } from './use-params';

function Page() {
  return null;
}

describe('useParams', () => {
  it('returns params for the active route', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', view: Page }] as const),
      initialEntries: ['/users/42'],
    });
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useParams('user'), { wrapper });

    expect(result.current).toEqual({ id: 42 });
    expectTypeOf(result.current.id).toEqualTypeOf<number>();
  });

  it('returns string params for custom constraints', async () => {
    const slug = createConstraint({
      parse(_paramName, value) {
        if (!/^[a-z0-9-]+$/.test(String(value))) {
          throw new Error('Invalid slug.');
        }
      },
      verify(_paramName, params) {
        if (params) {
          throw new Error('slug does not accept parameters.');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });
    const router = createMemoryRouter({
      routes: defineRoutes(
        [{ id: 'article', path: '/articles/{slug:slug}', view: Page }] as const,
        { pathConstraints: { slug } },
      ),
      initialEntries: ['/articles/urlkit-react'],
    });
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useParams('article'), { wrapper });

    expect(result.current).toEqual({ slug: 'urlkit-react' });
  });

  it('infers params for slot route IDs', () => {
    expectTypeOf(
      null as unknown as ReturnType<typeof useParams<'dashboard.sidebar.activity'>>,
    ).toEqualTypeOf<{ id: number }>();
  });
});
