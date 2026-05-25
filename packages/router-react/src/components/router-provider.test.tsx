import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test, vi } from 'vitest';
import { lazy } from 'react';
import { Link } from './link';
import { Outlet } from './outlet';
import { RouterProvider } from './router-provider';
import type { RouteErrorFallbackProps, RouterErrorFallbackProps } from './router-provider';
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

  test('renders nearest parent errorFallback for child route errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenPage(): never {
      throw new Error('child failed');
    }

    function ParentErrorFallback(props: RouteErrorFallbackProps) {
      return <p>parent error:{props.route.id}</p>;
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          layout: { component: Layout },
          errorFallback: ParentErrorFallback,
          children: [{ id: 'broken', index: true, component: BrokenPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('parent error:root')).toBeTruthy();
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
