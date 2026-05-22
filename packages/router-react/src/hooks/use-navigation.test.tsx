import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useNavigation } from './use-navigation';

function Page() {
  return null;
}

describe('useNavigation', () => {
  test('returns idle navigation state after resolution', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', component: Page }] as const),
    });
    await router.resolveCurrent();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current).toBe('idle');
  });
});
