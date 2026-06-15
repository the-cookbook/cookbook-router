import { render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, vi } from 'vitest';
import { RouterProvider } from './provider/router-provider';
import { lazyRouteView } from './lazy-route-view';

function Page() {
  return <h1>lazy page</h1>;
}

describe('lazyRouteView', () => {
  it('exposes a route-view preload hook and reuses the same import for rendering', async () => {
    const load = vi.fn(async () => ({ default: Page }));
    const LazyPage = lazyRouteView(load);
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', view: LazyPage }] as const),
    });

    await router.preload('home');
    await router.start();
    const { getByText } = render(<RouterProvider router={router} />);

    await waitFor(() => expect(getByText('lazy page')).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(1);
  });
});
