import { act, renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useNavigate } from './use-navigate';

function Page() {
  return null;
}

describe('useNavigate', () => {
  test('navigates through the router API', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', component: Page },
        { id: 'user', path: '/users/{id:int}', component: Page },
      ] as const),
    });
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
});
