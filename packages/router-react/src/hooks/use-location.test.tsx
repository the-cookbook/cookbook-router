import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useLocation } from './use-location';

function Page() {
  return null;
}

describe('useLocation', () => {
  it('returns current location including search and hash', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      initialEntries: ['/page?tab=a#top'],
    });
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useLocation(), { wrapper });

    expect(result.current).toMatchObject({
      pathname: '/page',
      search: '?tab=a',
      hash: '#top',
      href: '/page?tab=a#top',
    });
  });
});
