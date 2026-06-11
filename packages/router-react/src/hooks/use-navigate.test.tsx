import { act, renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useNavigate } from './use-navigate';

function Page() {
  return null;
}

function createTestRouter() {
  return createMemoryRouter({
    routes: defineRoutes([
      { id: 'home', path: '/', view: Page },
      { id: 'user', path: '/users/{id:int}', view: Page },
    ] as const),
  });
}

describe('useNavigate', () => {
  it('navigates through the router API', async () => {
    const router = createTestRouter();
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useNavigate(), { wrapper });

    await act(async () => {
      await result.current.to('user', { params: { id: 22 } });
    });

    expect(router.state.location.href).toBe('/users/22');
  });

  it('passes preventScrollReset through navigate options', async () => {
    const router = createTestRouter();
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useNavigate(), { wrapper });

    await act(async () => {
      await result.current.to('user', { params: { id: 22 }, preventScrollReset: true });
    });

    expect(router.state.location.state).toEqual({
      __cookbookRouterScroll: { preventReset: true },
    });
  });
});
