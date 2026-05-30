import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, vi } from 'vitest';
import { NavLink } from './nav-link';
import { RouterProvider } from './router-provider';

function Page() {
  return <p>page</p>;
}

describe('NavLink', () => {
  it('marks matching href as active', async () => {
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

  it('passes active state to render prop children', async () => {
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

  it('end=true requires the complete href including search params', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', component: Page }] as const),
      initialEntries: ['/users/1?tab=settings'],
    });
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink route="user" params={{ id: 1 }} search={{ tab: 'profile' }} end>
          profile
        </NavLink>
        <NavLink route="user" params={{ id: 1 }} search={{ tab: 'settings' }} end>
          settings
        </NavLink>
      </RouterProvider>,
    );

    expect(getByText('profile').getAttribute('aria-current')).toBeNull();
    expect(getByText('settings').getAttribute('aria-current')).toBe('page');
  });

  it('end search=all requires all search params to match', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', component: Page }] as const),
      initialEntries: ['/users/1?tab=settings'],
    });
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink
          route="user"
          params={{ id: 1 }}
          search={{ tab: 'settings' }}
          end={{ search: 'all' }}
        >
          exact search
        </NavLink>
      </RouterProvider>,
    );

    expect(getByText('exact search').getAttribute('aria-current')).toBe('page');
  });

  it('end search=ignore matches the pathname while ignoring search params', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', component: Page }] as const),
      initialEntries: ['/users/1?tab=settings'],
    });
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink
          route="user"
          params={{ id: 1 }}
          search={{ tab: 'profile' }}
          end={{ search: 'ignore' }}
        >
          ignored search
        </NavLink>
      </RouterProvider>,
    );

    expect(getByText('ignored search').getAttribute('aria-current')).toBe('page');
  });

  it('passes preventScrollReset to Link navigation', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', component: Page },
        { id: 'settings', path: '/settings', component: Page },
      ] as const),
    });
    await router.resolveCurrent();
    const navigate = vi.spyOn(router.navigate, 'to');

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink route="settings" preventScrollReset>
          settings no scroll
        </NavLink>
      </RouterProvider>,
    );

    fireEvent.click(getByText('settings no scroll'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('settings', { preventScrollReset: true }),
    );
  });
});
