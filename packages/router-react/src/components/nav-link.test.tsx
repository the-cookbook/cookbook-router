import { render } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { NavLink } from './nav-link';
import { RouterProvider } from './router-provider';

function Page() {
  return <p>page</p>;
}

describe('NavLink', () => {
  test('marks matching href as active', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', component: Page },
        { id: 'settings', path: '/settings', component: Page },
      ] as const),
      initialEntries: ['/settings'],
    });
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink route="settings">settings</NavLink>
      </RouterProvider>,
    );

    expect(getByText('settings').getAttribute('aria-current')).toBe('page');
  });

  test('passes active state to render prop children', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', component: Page }] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink route="home">
          {({ isActive }: { isActive: boolean }) => (isActive ? 'active' : 'inactive')}
        </NavLink>
      </RouterProvider>,
    );

    expect(getByText('active')).toBeTruthy();
  });
});
