import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { Link } from './link';
import { Outlet } from './outlet';
import { RouterProvider } from './router-provider';
import { useLocation } from '../hooks/use-location';

function Layout() {
  return (
    <section>
      <span>layout</span>
      <Outlet />
    </section>
  );
}

function HomePage() {
  return <h1>home</h1>;
}

function UserPage() {
  const location = useLocation();
  return <h1>user:{location.href}</h1>;
}

function createRouter() {
  return createMemoryRouter({
    routes: defineRoutes([
      {
        id: 'root',
        path: '/',
        layout: { component: Layout },
        children: [
          { id: 'home', index: true, component: HomePage },
          { id: 'users.show', path: 'users/{id:int}', component: UserPage },
        ],
      },
    ] as const),
  });
}

describe('RouterProvider', () => {
  test('renders the active layout, outlet, and page route', async () => {
    const router = createRouter();
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('layout')).toBeTruthy();
    expect(getByText('home')).toBeTruthy();
  });

  test('rerenders when router state changes through navigation', async () => {
    const router = createRouter();
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link route="users.show" params={{ id: 42 }}>
          user
        </Link>
        <UserPage />
      </RouterProvider>,
    );

    fireEvent.click(getByText('user'));

    await waitFor(() => expect(getByText('user:/users/42')).toBeTruthy());
  });

  test('resolves redirect-only routes when mounted', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'entry',
          path: '/',
          redirect: {
            route: 'dashboard',
          },
        },
        {
          id: 'dashboard',
          path: '/dashboard',
          component: HomePage,
        },
      ] as const),
    });

    const { getByText, queryByText } = render(
      <RouterProvider router={router} fallback={<p>not found</p>} />,
    );

    expect(queryByText('not found')).toBeNull();
    await waitFor(() => expect(getByText('home')).toBeTruthy());
    expect(router.state.location.href).toBe('/dashboard');
  });

  test('renders fallback when no route matches', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', component: HomePage }] as const),
      initialEntries: ['/missing'],
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} fallback={<p>not found</p>} />);

    expect(getByText('not found')).toBeTruthy();
  });
});
