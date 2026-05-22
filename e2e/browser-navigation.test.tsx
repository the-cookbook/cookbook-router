import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { createRouter, defineRoutes } from '@cookbook/router';
import { Link, Outlet, RouterProvider, useLocation, useParams } from '@cookbook/router-react';

function Layout() {
  return (
    <main>
      <Link route="home">Home</Link>
      <Link route="user" params={{ id: '5' }} search={{ tab: 'profile' }} hash="top">
        User
      </Link>
      <Outlet />
    </main>
  );
}

function HomePage() {
  const location = useLocation();
  return <h1>Home {location.href}</h1>;
}

function UserPage() {
  const params = useParams('user');
  const location = useLocation();
  return (
    <h1>
      User {params.id} {location.href}
    </h1>
  );
}

const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: { component: Layout },
    children: [
      { id: 'home', index: true, component: HomePage },
      {
        id: 'user',
        path: 'users/{id:int}',
        search: { tab: 'optional-string' },
        hash: ['top'],
        component: UserPage,
      },
    ],
  },
] as const);

describe('browser-like navigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  test('Link clicks push to the address bar, back restores source route, and forward restores destination route', async () => {
    const router = createRouter({ routes });
    await router.resolveCurrent();
    const view = render(<RouterProvider router={router} />);

    expect(view.getByText('Home /')).toBeTruthy();

    fireEvent.click(view.getByText('User'));
    await waitFor(() => expect(window.location.pathname).toBe('/users/5'));
    expect(window.location.search).toBe('?tab=profile');
    expect(window.location.hash).toBe('#top');
    expect(view.getByText('User 5 /users/5?tab=profile#top')).toBeTruthy();

    window.history.back();
    await waitFor(() => expect(view.getByText('Home /')).toBeTruthy());
    expect(window.location.pathname).toBe('/');

    window.history.forward();
    await waitFor(() => expect(view.getByText('User 5 /users/5?tab=profile#top')).toBeTruthy());
    expect(window.location.pathname).toBe('/users/5');
  });

  test('replace navigation keeps the route state and browser URL synchronized', async () => {
    const router = createRouter({ routes });
    await router.resolveCurrent();
    render(<RouterProvider router={router} />);

    await router.navigate.replace('user', {
      params: { id: '6' },
      search: { tab: 'profile' },
      hash: 'top',
    });

    expect(window.location.pathname).toBe('/users/6');
    expect(router.state.location.href).toBe('/users/6?tab=profile#top');
    expect(router.state.match?.id).toBe('user');
  });
});
