import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test, vi } from 'vitest';
import { lazy, useEffect } from 'react';
import { Link } from './link';
import { Outlet } from './outlet';
import { RouterProvider } from './router-provider';
import type { RouteErrorFallbackProps, RouterErrorFallbackProps } from './router-provider';
import { useLocation } from '../hooks/use-location';
import { useNavigate } from '../hooks/use-navigate';

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

function AboutPage() {
  return <h1>about</h1>;
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

  test('does not freeze when replace navigation is requested during render', async () => {
    function MissingUserPage() {
      const navigate = useNavigate();
      void navigate.replace('not-found');
      return null;
    }

    function NotFoundPage() {
      return <h1>not found</h1>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'users.show', path: '/users/{slug}', component: MissingUserPage },
        { id: 'not-found', path: '/not-found', component: NotFoundPage },
      ] as const),
      initialEntries: ['/users/missing'],
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    await waitFor(() => expect(getByText('not found')).toBeTruthy());
    expect(router.state.location.href).toBe('/not-found');
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
  test('renders route loading fallback when route component suspends', async () => {
    let resolvePage: ((value: { default: typeof HomePage }) => void) | undefined;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: typeof HomePage }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    function LoadingPage() {
      return <p>loading article</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'article',
          path: '/',
          component: LazyPage,
          loading: LoadingPage,
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('loading article')).toBeTruthy();

    await act(async () => {
      resolvePage?.({ default: HomePage });
    });

    await waitFor(() => expect(getByText('home')).toBeTruthy());
  });

  test('renders route loading fallback inside the parent outlet when route component suspends', async () => {
    const LazyPage = lazy(() => new Promise<{ default: typeof HomePage }>(() => undefined));

    function ShellLayout() {
      return (
        <section aria-label="article shell">
          <h1>article shell</h1>
          <div data-testid="article-outlet">
            <Outlet />
          </div>
        </section>
      );
    }

    function LoadingPage() {
      return (
        <article>
          <p>loading inside outlet</p>
          <Outlet />
        </article>
      );
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          layout: { component: ShellLayout },
          children: [
            {
              id: 'article',
              index: true,
              component: LazyPage,
              loading: LoadingPage,
            },
          ],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('article shell')).toBeTruthy();
    expect(getByTestId('article-outlet').textContent).toContain('loading inside outlet');
  });

  test('renders same-route layout loading fallback inside that route layout outlet', async () => {
    const LazyPage = lazy(() => new Promise<{ default: typeof HomePage }>(() => undefined));

    function DashboardLayout() {
      return (
        <section>
          <h1>dashboard layout shell</h1>
          <main data-testid="dashboard-layout-outlet">
            <Outlet />
          </main>
        </section>
      );
    }

    function DashboardLoading() {
      return <p>dashboard route loading</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/',
          component: LazyPage,
          layout: { component: DashboardLayout, loading: DashboardLoading },
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('dashboard layout shell')).toBeTruthy();
    expect(getByTestId('dashboard-layout-outlet').textContent).toContain('dashboard route loading');
  });

  test('keeps same-route layout mounted while its component loads', async () => {
    let resolvePage: ((value: { default: typeof HomePage }) => void) | undefined;
    let mountCount = 0;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: typeof HomePage }>((resolve) => {
          resolvePage = resolve;
        }),
    );

    function StableLayout() {
      useEffect(() => {
        mountCount += 1;
      }, []);

      return (
        <section>
          <h1>stable layout shell</h1>
          <main data-testid="stable-layout-outlet">
            <Outlet />
          </main>
        </section>
      );
    }

    function LayoutLoading() {
      return <p>stable layout loading</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/',
          component: LazyPage,
          layout: { component: StableLayout, loading: LayoutLoading },
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('stable layout shell')).toBeTruthy();
    expect(getByTestId('stable-layout-outlet').textContent).toContain('stable layout loading');
    expect(mountCount).toBe(1);

    await act(async () => {
      resolvePage?.({ default: HomePage });
    });

    await waitFor(() => expect(getByText('home')).toBeTruthy());
    expect(mountCount).toBe(1);
  });

  test('keeps the same layout component mounted across sibling route navigation', async () => {
    let layoutMounts = 0;

    function PersistentLayout() {
      useEffect(() => {
        layoutMounts += 1;
      }, []);

      return (
        <section>
          <h1>persistent shell</h1>
          <main data-testid="persistent-shell-outlet">
            <Outlet />
          </main>
        </section>
      );
    }

    function LoadingFallback() {
      return <p>loading fallback</p>;
    }

    function ErrorFallback() {
      return <p>error fallback</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'overview',
          path: '/overview',
          component: HomePage,
          layout: { component: PersistentLayout, loading: LoadingFallback },
        },
        {
          id: 'reports',
          path: '/reports',
          component: AboutPage,
          layout: { component: PersistentLayout, errorFallback: ErrorFallback },
        },
      ] as const),
      initialEntries: ['/overview'],
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('persistent shell')).toBeTruthy();
    expect(getByTestId('persistent-shell-outlet').textContent).toContain('home');
    expect(layoutMounts).toBe(1);

    await act(async () => {
      await router.navigate.to('reports');
    });

    expect(getByText('persistent shell')).toBeTruthy();
    expect(getByTestId('persistent-shell-outlet').textContent).toContain('about');
    expect(layoutMounts).toBe(1);
  });

  test('does not share route-level loading fallback with child routes', async () => {
    const LazyPage = lazy(() => new Promise<{ default: typeof HomePage }>(() => undefined));

    function ParentLoading() {
      return <p>parent route loading</p>;
    }

    function GlobalLoading() {
      return <p>global loading</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'parent',
          path: '/',
          component: Layout,
          loading: ParentLoading,
          children: [{ id: 'child', index: true, component: LazyPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, queryByText } = render(
      <RouterProvider router={router} loadingFallback={<GlobalLoading />} />,
    );

    expect(getByText('global loading')).toBeTruthy();
    expect(queryByText('parent route loading')).toBeNull();
  });

  test('keeps a shared layout mounted while navigating to a lazy child route', async () => {
    let resolveReports: ((value: { default: typeof AboutPage }) => void) | undefined;
    let mountCount = 0;
    const LazyReportsPage = lazy(
      () =>
        new Promise<{ default: typeof AboutPage }>((resolve) => {
          resolveReports = resolve;
        }),
    );

    function StableDashboardLayout() {
      useEffect(() => {
        mountCount += 1;
      }, []);

      return (
        <section>
          <h1>dashboard persistent shell</h1>
          <main data-testid="persistent-dashboard-outlet">
            <Outlet />
          </main>
        </section>
      );
    }

    function DashboardLoading() {
      return <p>dashboard child loading</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/',
          layout: { component: StableDashboardLayout, loading: DashboardLoading },
          children: [
            { id: 'dashboard.home', index: true, component: HomePage },
            { id: 'dashboard.reports', path: 'reports', component: LazyReportsPage },
          ],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('dashboard persistent shell')).toBeTruthy();
    expect(getByText('home')).toBeTruthy();
    expect(mountCount).toBe(1);

    await act(async () => {
      void router.navigate.to('dashboard.reports');
    });

    expect(getByText('dashboard persistent shell')).toBeTruthy();
    expect(getByTestId('persistent-dashboard-outlet').textContent).toContain(
      'dashboard child loading',
    );
    expect(mountCount).toBe(1);

    await act(async () => {
      resolveReports?.({ default: AboutPage });
    });

    await waitFor(() => expect(getByText('about')).toBeTruthy());
    expect(mountCount).toBe(1);
  });

  test('uses layout loading fallback for child routes without their own loading fallback', async () => {
    const LazyPage = lazy(() => new Promise<{ default: typeof HomePage }>(() => undefined));

    function ShellLayout() {
      return (
        <section>
          <h1>dashboard shell</h1>
          <main data-testid="dashboard-outlet">
            <Outlet />
          </main>
        </section>
      );
    }

    function DashboardLoading() {
      return <p>dashboard section loading</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/',
          layout: { component: ShellLayout, loading: DashboardLoading },
          children: [{ id: 'dashboard.home', index: true, component: LazyPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('dashboard shell')).toBeTruthy();
    expect(getByTestId('dashboard-outlet').textContent).toContain('dashboard section loading');
  });

  test('prefers route loading fallback over inherited layout loading fallback', async () => {
    const LazyPage = lazy(() => new Promise<{ default: typeof HomePage }>(() => undefined));

    function ShellLayout() {
      return <Outlet />;
    }

    function LayoutLoading() {
      return <p>layout loading</p>;
    }

    function RouteLoading() {
      return <p>route loading</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/',
          layout: { component: ShellLayout, loading: LayoutLoading },
          children: [
            {
              id: 'dashboard.home',
              index: true,
              component: LazyPage,
              loading: RouteLoading,
            },
          ],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, queryByText } = render(<RouterProvider router={router} />);

    expect(getByText('route loading')).toBeTruthy();
    expect(queryByText('layout loading')).toBeNull();
  });

  test('renders global loading fallback when route component suspends without route loading', async () => {
    const LazyPage = lazy(() => new Promise<{ default: typeof HomePage }>(() => undefined));

    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'article', path: '/', component: LazyPage }] as const),
    });

    await router.resolveCurrent();

    const { findByText } = render(
      <RouterProvider router={router} loadingFallback={<p>global loading</p>} />,
    );

    expect(await findByText('global loading')).toBeTruthy();
  });

  test('renders route errorFallback when route component throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenPage(): never {
      throw new Error('article failed');
    }

    function ArticleErrorFallback(props: RouteErrorFallbackProps) {
      return <p>route error:{props.route.id}</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'article',
          path: '/',
          component: BrokenPage,
          errorFallback: ArticleErrorFallback,
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('route error:article')).toBeTruthy();
    consoleError.mockRestore();
  });

  test('renders nearest layout errorFallback for child route errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenPage(): never {
      throw new Error('child failed');
    }

    function LayoutErrorFallback(props: RouteErrorFallbackProps) {
      return <p>layout error:{props.route.id}</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          layout: { component: Layout, errorFallback: LayoutErrorFallback },
          children: [{ id: 'broken', index: true, component: BrokenPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('layout error:root')).toBeTruthy();
    consoleError.mockRestore();
  });

  test('renders same-route layout errorFallback inside that route layout outlet', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenPage(): never {
      throw new Error('same route failed');
    }

    function ErrorLayout() {
      return (
        <section>
          <h1>error layout shell</h1>
          <main data-testid="error-layout-outlet">
            <Outlet />
          </main>
        </section>
      );
    }

    function LayoutErrorFallback(props: RouteErrorFallbackProps) {
      return <p>same layout error:{props.route.id}</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/',
          component: BrokenPage,
          layout: { component: ErrorLayout, errorFallback: LayoutErrorFallback },
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, getByTestId } = render(<RouterProvider router={router} />);

    expect(getByText('error layout shell')).toBeTruthy();
    expect(getByTestId('error-layout-outlet').textContent).toContain('same layout error:dashboard');
    consoleError.mockRestore();
  });

  test('does not share route-level errorFallback with child routes', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenPage(): never {
      throw new Error('child failed');
    }

    function ParentRouteErrorFallback(props: RouteErrorFallbackProps) {
      return <p>parent route error:{props.route.id}</p>;
    }

    function GlobalErrorFallback(props: RouterErrorFallbackProps) {
      return <p>global child error:{props.route?.id}</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'parent',
          path: '/',
          component: Layout,
          errorFallback: ParentRouteErrorFallback,
          children: [{ id: 'child', index: true, component: BrokenPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, queryByText } = render(
      <RouterProvider router={router} errorFallback={GlobalErrorFallback} />,
    );

    expect(getByText('global child error:child')).toBeTruthy();
    expect(queryByText('parent route error:parent')).toBeNull();
    consoleError.mockRestore();
  });

  test('renders global errorFallback when no route errorFallback exists', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenPage(): never {
      throw new Error('global failed');
    }

    function GlobalErrorFallback(props: RouterErrorFallbackProps) {
      return <p>global error:{props.route?.id}</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'broken', path: '/', component: BrokenPage }] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router} errorFallback={GlobalErrorFallback} />,
    );

    expect(getByText('global error:broken')).toBeTruthy();
    consoleError.mockRestore();
  });

  test('allows route errorFallback to reset after the thrown error is fixed', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;

    function MaybeBrokenPage() {
      if (shouldThrow) {
        throw new Error('temporary failure');
      }

      return <p>recovered</p>;
    }

    function ArticleErrorFallback(props: RouteErrorFallbackProps) {
      return (
        <button type="button" onClick={props.reset}>
          retry
        </button>
      );
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'article',
          path: '/',
          component: MaybeBrokenPage,
          errorFallback: ArticleErrorFallback,
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    shouldThrow = false;
    fireEvent.click(getByText('retry'));

    await waitFor(() => expect(getByText('recovered')).toBeTruthy());
    consoleError.mockRestore();
  });
});

describe('RouterProvider scroll restoration', () => {
  test('scrolls to the top on push navigation when enabled', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = createRouter();
    await router.resolveCurrent();

    render(<RouterProvider router={router} scrollRestoration />);

    await act(async () => {
      await router.navigate.to('users.show', { params: { id: 1 } });
    });

    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({
        left: 0,
        top: 0,
        behavior: 'auto',
      }),
    );

    scrollTo.mockRestore();
  });

  test('does not reset scroll when navigation opts out', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = createRouter();
    await router.resolveCurrent();

    render(<RouterProvider router={router} scrollRestoration />);

    scrollTo.mockClear();

    await act(async () => {
      await router.navigate.to('users.show', {
        params: { id: 1 },
        preventScrollReset: true,
      });
    });

    expect(scrollTo).not.toHaveBeenCalled();
    expect(router.state.location.state).toEqual({
      __cookbookRouterScroll: { preventReset: true },
    });

    scrollTo.mockRestore();
  });

  test('uses configured scroll behavior when resetting scroll position', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'home',
          path: '/',
          component: HomePage,
        },
      ] as const),
    });

    await router.resolveCurrent();

    render(<RouterProvider router={router} scrollRestoration scrollBehavior="smooth" />);

    expect(scrollTo).toHaveBeenCalledWith({
      left: 0,
      top: 0,
      behavior: 'smooth',
    });

    scrollTo.mockRestore();
  });

  test('uses auto scroll behavior by default', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'home',
          path: '/',
          component: HomePage,
        },
      ] as const),
    });

    await router.resolveCurrent();

    render(<RouterProvider router={router} scrollRestoration />);

    expect(scrollTo).toHaveBeenCalledWith({
      left: 0,
      top: 0,
      behavior: 'auto',
    });

    scrollTo.mockRestore();
  });

  test('uses configured scroll behavior when restoring saved scroll position', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    Object.defineProperty(window, 'scrollX', {
      configurable: true,
      value: 20,
    });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 300,
    });

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'home',
          path: '/',
          component: HomePage,
        },
        {
          id: 'about',
          path: '/about',
          component: AboutPage,
        },
      ] as const),
    });

    await router.resolveCurrent();

    const view = render(
      <RouterProvider router={router} scrollRestoration scrollBehavior="smooth" />,
    );

    await act(async () => {
      await router.navigate.to('about');
    });

    await act(async () => {
      router.navigate.back();
    });

    view.rerender(<RouterProvider router={router} scrollRestoration scrollBehavior="smooth" />);

    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 20,
      top: 300,
      behavior: 'smooth',
    });

    scrollTo.mockRestore();
  });
});
