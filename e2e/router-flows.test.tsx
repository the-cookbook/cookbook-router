import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryRouter,
  createStaticRouter,
  defineRoutes,
  serializeRouterState,
} from '@cookbook/router';
import type { Middleware } from '@cookbook/router';
import {
  Link,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from '@cookbook/router-react';

function RootLayout() {
  return (
    <main>
      <Link route="home">Home</Link>
      <Link route="user" params={{ id: '42' }} search={{ tab: 'settings' }} hash="profile">
        User 42
      </Link>
      <Link route="admin">Admin</Link>
      <Outlet />
    </main>
  );
}

function HomePage() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() =>
        void navigate.to('user', {
          params: { id: '7' },
          search: { tab: 'profile' },
          hash: 'details',
        })
      }
    >
      Open typed user
    </button>
  );
}

function UserPage() {
  const params = useParams('user');
  const search = useSearchParams('user');
  const location = useLocation();
  return (
    <h1>
      User {params.id} {search.tab} {location.hash}
    </h1>
  );
}

function AdminPage() {
  return <h1>Admin</h1>;
}

function LoginPage() {
  return <h1>Login</h1>;
}

const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: { view: RootLayout },
    children: [
      { id: 'home', index: true, view: HomePage },
      {
        id: 'user',
        path: 'users/{id:int}',
        search: { tab: { type: 'string', optional: true } },
        hash: { type: 'enum', values: ['profile', 'details'], optional: true },
        view: UserPage,
        lifecycle: {
          beforeEnter: ({ location }) => events.push(`before:${location.href}`),
          afterEnter: ({ location }) => events.push(`after:${location.href}`),
        },
      },
      { id: 'admin', path: 'admin', view: AdminPage, meta: { requiresAuth: true } },
      { id: 'login', path: 'login', view: LoginPage },
    ],
  },
] as const);

const events: string[] = [];

describe('repository-level router flows', () => {
  it('navigates with typed params, search, hash, middleware, lifecycle, and redirects', async () => {
    events.length = 0;
    const middleware: Middleware = ({ route, redirect }) => {
      if (route.route.meta?.requiresAuth) {
        return redirect('/login');
      }
    };
    const afterNavigate = vi.fn();
    const router = createMemoryRouter({
      routes,
      middleware: [middleware],
      lifecycle: { afterNavigate },
    });
    await router.resolveCurrent();

    const view = render(<RouterProvider router={router} fallback={<h1>Not found</h1>} />);

    fireEvent.click(view.getByText('Open typed user'));
    await waitFor(() => expect(view.getByText('User 7 profile #details')).toBeTruthy());

    expect(router.state.location.href).toBe('/users/7?tab=profile#details');
    expect(events).toEqual([
      'before:/users/7?tab=profile#details',
      'after:/users/7?tab=profile#details',
    ]);
    expect(afterNavigate).toHaveBeenCalled();

    fireEvent.click(view.getByText('Admin'));
    await waitFor(() => expect(view.getByText('Login')).toBeTruthy());
    expect(router.state.location.href).toBe('/login');
  });

  it('supports provider middleware redirects and rewrites', async () => {
    const redirectRouter = createMemoryRouter({ routes, initialEntries: ['/admin'] });
    const redirectView = render(
      <RouterProvider
        router={redirectRouter}
        fallback={<h1>Not found</h1>}
        middleware={[
          ({ route, redirect }) =>
            route.route.meta?.requiresAuth ? redirect('/login?redirect=%2Fadmin') : undefined,
        ]}
      />,
    );

    await waitFor(() => expect(redirectView.getByText('Login')).toBeTruthy());
    expect(redirectRouter.state.location.href).toBe('/login?redirect=%2Fadmin');
    redirectView.unmount();

    const rewriteRouter = createMemoryRouter({ routes, initialEntries: ['/admin'] });
    const rewriteView = render(
      <RouterProvider
        router={rewriteRouter}
        fallback={<h1>Not found</h1>}
        middleware={[
          ({ route, rewrite }) =>
            route.route.meta?.requiresAuth ? rewrite('/login?redirect=%2Fadmin') : undefined,
        ]}
      />,
    );

    await waitFor(() => expect(rewriteView.getByText('Login')).toBeTruthy());
    expect(rewriteRouter.state.location.href).toBe('/login?redirect=%2Fadmin');
  });

  it('handles not found routes through provider fallback without mocking matching internals', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/does-not-exist'] });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} fallback={<h1>Not found</h1>} />);

    expect(getByText('Not found')).toBeTruthy();
    expect(router.state.match).toBeNull();
  });

  it('reports href and route validation errors from public APIs', () => {
    const router = createMemoryRouter({ routes });

    expect(() => router.href('user', { params: { id: 'abc' } as never })).toThrow(
      'expected param "id"',
    );
    expect(() =>
      createMemoryRouter({
        routes: defineRoutes([{ id: 'bad', index: true, path: '/bad' }] as const),
      }),
    ).toThrow('index');
  });

  it('serializes static SSR state and hydrates a memory router to the same route', async () => {
    const staticRouter = createStaticRouter({ routes, url: '/users/9?tab=settings#profile' });
    await staticRouter.resolveCurrent();
    const hydrationData = serializeRouterState(staticRouter);
    const hydratedRouter = createMemoryRouter({ routes, hydrationData, initialEntries: ['/'] });

    expect(hydratedRouter.state.location.href).toBe('/users/9?tab=settings#profile');
    expect(hydratedRouter.state.match?.id).toBe('user');

    const { getByText } = render(<RouterProvider router={hydratedRouter} />);
    expect(getByText('User 9 settings #profile')).toBeTruthy();
  });
});
