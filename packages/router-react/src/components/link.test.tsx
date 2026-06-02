import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, vi } from 'vitest';
import { Link } from './link';
import { RouterProvider } from './router-provider';
import { useLocation } from '../hooks/use-location';

function LocationView() {
  const location = useLocation();
  return <p>{location.href}</p>;
}

function createRouter() {
  return createMemoryRouter({
    routes: defineRoutes([
      { id: 'home', path: '/', component: LocationView },
      { id: 'user', path: '/users/{id:int}', component: LocationView },
    ] as const),
  });
}

describe('Link', () => {
  it('renders a real href with params, search, and hash', async () => {
    const router = createRouter();
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link route="user" params={{ id: 7 }} search={{ tab: 'settings' }} hash="top">
          profile
        </Link>
      </RouterProvider>,
    );

    expect(getByText('profile').getAttribute('href')).toBe('/users/7?tab=settings#top');
  });

  it('supports the to alias for lower-boilerplate links', async () => {
    const router = createRouter();
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link to="user" params={{ id: 6 }}>
          alias
        </Link>
      </RouterProvider>,
    );

    expect(getByText('alias').getAttribute('href')).toBe('/users/6');
  });

  it('left click performs client navigation', async () => {
    const router = createRouter();
    await router.resolveCurrent();

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link route="user" params={{ id: 8 }}>
          go
        </Link>
        <LocationView />
      </RouterProvider>,
    );

    fireEvent.click(getByText('go'));

    await waitFor(() => expect(getByText('/users/8')).toBeTruthy());
  });

  it('replace click performs replace navigation', async () => {
    const router = createRouter();
    await router.resolveCurrent();
    const replace = vi.spyOn(router.navigate, 'replace');

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link route="user" params={{ id: 8 }} context={{ source: 'link' }} replace>
          go
        </Link>
      </RouterProvider>,
    );

    fireEvent.click(getByText('go'));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('user', {
        params: { id: 8 },
        context: { source: 'link' },
      }),
    );
  });

  it('passes preventScrollReset to navigation options', async () => {
    const router = createRouter();
    await router.resolveCurrent();
    const navigate = vi.spyOn(router.navigate, 'to');

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link route="user" params={{ id: 2 }} preventScrollReset>
          no scroll reset
        </Link>
      </RouterProvider>,
    );

    fireEvent.click(getByText('no scroll reset'));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('user', {
        params: { id: 2 },
        preventScrollReset: true,
      }),
    );
  });

  it('preserves native behavior for explicit same-origin hrefs without a route id', async () => {
    const router = createRouter();
    await router.resolveCurrent();
    const navigate = vi.spyOn(router.navigate, 'to');

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link href="/users/3">native local href</Link>
        <LocationView />
      </RouterProvider>,
    );

    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    const allowed = getByText('native local href').dispatchEvent(event);

    expect(allowed).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(getByText('/')).toBeTruthy();
  });

  it('modifier and external clicks preserve browser behavior', async () => {
    const router = createRouter();
    await router.resolveCurrent();
    const navigate = vi.spyOn(router.navigate, 'to');

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link route="user" params={{ id: 9 }}>
          modified
        </Link>
        <Link href="https://other.it/path">external</Link>
      </RouterProvider>,
    );

    fireEvent.click(getByText('modified'), { metaKey: true });
    fireEvent.click(getByText('external'));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('respects prevented events', async () => {
    const router = createRouter();
    await router.resolveCurrent();
    const navigate = vi.spyOn(router.navigate, 'to');

    const { getByText } = render(
      <RouterProvider router={router}>
        <Link
          route="user"
          params={{ id: 1 }}
          onClick={(event: import('react').MouseEvent<HTMLAnchorElement>) => event.preventDefault()}
        >
          blocked
        </Link>
      </RouterProvider>,
    );

    fireEvent.click(getByText('blocked'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
