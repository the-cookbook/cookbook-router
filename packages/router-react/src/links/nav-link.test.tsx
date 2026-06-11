import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, vi } from 'vitest';
import { NavLink } from './nav-link';
import { RouterProvider } from '../provider/router-provider';

function Page() {
  return <p>page</p>;
}

describe('NavLink', () => {
  it('marks matching href as active', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', view: Page },
        { id: 'settings', path: '/settings', view: Page },
      ] as const),
      initialEntries: ['/settings'],
    });
    await router.start();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink route="settings">settings</NavLink>
      </RouterProvider>,
    );

    expect(getByText('settings').getAttribute('aria-current')).toBe('page');
  });

  it('marks a local href as active', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', view: Page },
        { id: 'settings', path: '/settings', view: Page },
      ] as const),
      initialEntries: ['/settings'],
    });
    await router.start();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink href="/settings">settings href</NavLink>
      </RouterProvider>,
    );

    expect(getByText('settings href').getAttribute('href')).toBe('/settings');
    expect(getByText('settings href').getAttribute('aria-current')).toBe('page');
  });

  it('marks a same-origin absolute href as active', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', view: Page },
        { id: 'settings', path: '/settings', view: Page },
      ] as const),
      initialEntries: ['/settings'],
    });
    await router.start();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink href={`${window.location.origin}/settings`}>absolute settings href</NavLink>
      </RouterProvider>,
    );

    expect(getByText('absolute settings href').getAttribute('aria-current')).toBe('page');
  });

  it('passes active state to render prop children', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', view: Page }] as const),
    });
    await router.start();

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
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', view: Page }] as const),
      initialEntries: ['/users/1?tab=settings'],
    });
    await router.start();

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
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', view: Page }] as const),
      initialEntries: ['/users/1?tab=settings'],
    });
    await router.start();

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
      routes: defineRoutes([{ id: 'user', path: '/users/{id:int}', view: Page }] as const),
      initialEntries: ['/users/1?tab=settings'],
    });
    await router.start();

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

  it('forwards URL options while preserving active matching', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { tags: { type: 'string', many: true, optional: true } },
          view: Page,
        },
      ] as const),
      initialEntries: ['/products?tags=router%2Ctypescript'],
      url: { arrayFormat: 'repeat' },
    });
    await router.start();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink
          route="products"
          search={{ tags: ['router', 'typescript'] }}
          url={{ arrayFormat: 'comma' }}
          end
        >
          products
        </NavLink>
      </RouterProvider>,
    );

    expect(getByText('products').getAttribute('href')).toBe('/products?tags=router%2Ctypescript');
    expect(getByText('products').getAttribute('aria-current')).toBe('page');
  });

  it('forwards default serialization options while preserving active matching', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'listing',
          path: '/listing',
          search: { page: { type: 'int', default: 1 } },
          view: Page,
        },
      ] as const),
      initialEntries: ['/listing'],
    });
    await router.start();

    const { getByText } = render(
      <RouterProvider router={router}>
        <NavLink route="listing" search={{ page: 1 }} url={{ defaults: 'omit' }} end>
          listing
        </NavLink>
      </RouterProvider>,
    );

    expect(getByText('listing').getAttribute('href')).toBe('/listing');
    expect(getByText('listing').getAttribute('aria-current')).toBe('page');
  });

  it('passes preventScrollReset to Link navigation', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', view: Page },
        { id: 'settings', path: '/settings', view: Page },
      ] as const),
    });
    await router.start();
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
