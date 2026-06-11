import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryRouter,
  createStaticRouter,
  deserializeRouterState,
  serializeRouterState,
} from '@cookbook/router';
import { App as BasicApp } from '../examples/react-basic/src/app';
import { routes as basicRoutes, lifecycleEvents } from '../examples/react-basic/src/routes';
import { App as SlotsApp } from '../examples/react-slots/src/app';
import { routes as slotRoutes } from '../examples/react-slots/src/routes';
import { App as InterceptsApp } from '../examples/react-intercepts/src/app';
import { routes as interceptRoutes } from '../examples/react-intercepts/src/routes';
import { App as BlogApp } from '../examples/react-blog/src/app';
import { routes as blogRoutes } from '../examples/react-blog/src/routes';
import { App as DashboardApp } from '../examples/react-dashboard/app/app';
import { routes as dashboardRoutes } from '../examples/react-dashboard/app/routes';
import { App as SsrApp } from '../examples/react-ssr/src/app';
import { renderRequest } from '../examples/react-ssr/src/server';
import { routes as ssrRoutes, ssrEvents } from '../examples/react-ssr/src/routes';
import { auth } from '../examples/react-dashboard/app/state/auth';

const dashboardLazyPageTimeout = {
  timeout: 10_000,
};

class DashboardResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function installDashboardBrowserMocks() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: DashboardResizeObserver,
  });

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: DashboardResizeObserver,
  });

  if (!globalThis.PointerEvent) {
    Object.defineProperty(globalThis, 'PointerEvent', {
      configurable: true,
      writable: true,
      value: MouseEvent,
    });
  }

  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  Element.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}

describe('example application integration', () => {
  it('react-basic exercises generated contracts, typed params, search, hash, middleware, and lifecycle', async () => {
    lifecycleEvents.length = 0;
    const middlewareEvents: string[] = [];
    const router = createMemoryRouter({
      routes: basicRoutes,
      middleware: [
        ({ route }) => {
          if (route.route.meta?.requiresAuth) {
            middlewareEvents.push(route.id);
          }
        },
      ],
    });
    await router.start();

    const view = render(<BasicApp router={router} />);

    expect(view.getByText('Cookbook Router basic example')).toBeTruthy();
    fireEvent.click(view.getByText('Open user 7 security tab'));

    await waitFor(() => expect(view.getByText('User 7')).toBeTruthy());
    expect(router.state.location.href).toBe('/users/7?tab=profile#security');
    expect(middlewareEvents).toContain('users.show');
    expect(lifecycleEvents).toContain('users.beforeEnter');
    expect(lifecycleEvents).toContain('users.afterEnter');
  });

  it('react-slots renders fallback, matched slot routes, overrides, and disabled slots', async () => {
    const router = createMemoryRouter({ routes: slotRoutes, initialEntries: ['/dashboard'] });
    await router.start();
    const view = render(<SlotsApp router={router} />);

    expect(view.getByText('Overview')).toBeTruthy();
    expect(view.getByText('Default sidebar for John Doe')).toBeTruthy();

    fireEvent.click(view.getByText('Activity slot route'));
    await waitFor(() => expect(view.getByText('Activity sidebar for John Doe')).toBeTruthy());

    fireEvent.click(view.getByText('Settings'));
    await waitFor(() => expect(view.getByText('Settings sidebar for John Doe')).toBeTruthy());

    fireEvent.click(view.getByText('Fullscreen'));
    await waitFor(() => expect(view.getByText('Fullscreen')).toBeTruthy());
    expect(view.queryByText(/sidebar for John Doe/)).toBeNull();
  });

  it('react-intercepts supports configured, call-site, back, forward, and direct visit behavior', async () => {
    const router = createMemoryRouter({ routes: interceptRoutes, initialEntries: ['/gallery'] });
    await router.start();
    const view = render(<InterceptsApp router={router} />);

    fireEvent.click(view.getByText('Open configured modal'));
    await waitFor(() => expect(view.getByRole('dialog', { name: 'Photo modal' })).toBeTruthy());
    expect(view.getByText('Photo modal 1')).toBeTruthy();
    expect(view.getByText('Gallery')).toBeTruthy();
    expect(router.state.location.href).toBe('/photos/1?source=configured#details');

    router.navigate.back();
    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Photo modal' })).toBeNull());
    expect(router.state.location.href).toBe('/gallery');

    router.navigate.forward();
    await waitFor(() => expect(view.getByText('Photo modal 1')).toBeTruthy());

    router.navigate.back();
    await waitFor(() => expect(router.state.location.href).toBe('/gallery'));
    fireEvent.click(view.getByText('Open call-site modal'));
    await waitFor(() => expect(view.getByText('Photo modal 2')).toBeTruthy());
    expect(router.state.location.href).toBe('/photos/2?source=call-site#comments');

    view.unmount();

    const direct = createMemoryRouter({
      routes: interceptRoutes,
      initialEntries: ['/photos/2?source=direct#details'],
    });
    await direct.start();
    const directView = render(<InterceptsApp router={direct} />);
    expect(directView.getByText('Photo page 2')).toBeTruthy();
    expect(directView.queryByRole('dialog', { name: 'Photo modal' })).toBeNull();
  });

  it('react-blog proves blog post modal interception and canonical full page direct visits', async () => {
    const router = createMemoryRouter({ routes: blogRoutes, initialEntries: ['/blog'] });
    await router.start();
    const view = render(<BlogApp router={router} />);

    fireEvent.click(view.getAllByText('Read in modal')[0]);
    await waitFor(() => expect(view.getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy());
    expect(view.getByText(/Modal route for/)).toBeTruthy();
    expect(view.getByText('Rendered on home')).toBeTruthy();
    expect(view.getByText('Blog')).toBeTruthy();

    const hrefAfterModal = router.state.location.href;
    expect(hrefAfterModal.startsWith('/blog/')).toBe(true);

    router.navigate.back();
    await waitFor(() => expect(view.queryByRole('dialog', { name: 'Blog post modal' })).toBeNull());

    router.navigate.forward();
    await waitFor(() => expect(view.getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy());

    view.unmount();

    const direct = createMemoryRouter({ routes: blogRoutes, initialEntries: [hrefAfterModal] });
    await direct.start();
    const directView = render(<BlogApp router={direct} />);

    expect(await directView.findByText(/Full page route for/, {}, { timeout: 3000 })).toBeTruthy();

    expect(directView.queryByRole('dialog', { name: 'Blog post modal' })).toBeNull();
  });

  it('react-dashboard proves dashboard slots, configured create interception, and custom slug details', async () => {
    installDashboardBrowserMocks();

    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);

    const router = createMemoryRouter({
      routes: dashboardRoutes,
      initialEntries: ['/overview'],
    });
    await router.start();

    const view = render(<DashboardApp router={router} />);

    const breadcrumb = await view.findByRole(
      'navigation',
      { name: 'breadcrumb' },
      dashboardLazyPageTimeout,
    );

    expect(
      within(breadcrumb).getByRole('link', {
        name: 'Overview',
        current: 'page',
      }),
    ).toBeTruthy();

    expect(await view.findByText('Total Revenue', {}, dashboardLazyPageTimeout)).toBeTruthy();

    fireEvent.click(view.getByText('Quick Create'));

    await waitFor(
      () => expect(router.state.location.href).toBe('/create'),
      dashboardLazyPageTimeout,
    );

    expect(
      await view.findByRole('dialog', { name: 'Add section' }, dashboardLazyPageTimeout),
    ).toBeTruthy();

    expect(view.getByText('Total Revenue')).toBeTruthy();

    router.navigate.back();

    await waitFor(
      () => expect(router.state.location.href).toBe('/overview'),
      dashboardLazyPageTimeout,
    );

    await waitFor(
      () => expect(view.queryByRole('dialog', { name: 'Add section' })).toBeNull(),
      dashboardLazyPageTimeout,
    );

    fireEvent.click(view.getByText('Users'));

    await waitFor(
      () => expect(router.state.location.href).toBe('/users?status=all'),
      dashboardLazyPageTimeout,
    );

    expect(
      await view.findByRole('heading', { name: 'Users' }, dashboardLazyPageTimeout),
    ).toBeTruthy();

    fireEvent.click(await view.findByText('Eddie Lake', {}, dashboardLazyPageTimeout));

    await waitFor(
      () => expect(router.state.location.href).toBe('/users/eddie-lake'),
      dashboardLazyPageTimeout,
    );

    expect(
      await view.findByRole('heading', { name: 'Eddie Lake', level: 1 }, dashboardLazyPageTimeout),
    ).toBeTruthy();

    expect(view.getByText('eddie.lake@example.com')).toBeTruthy();

    await router.navigate.to('terms-of-service');

    await waitFor(
      () => expect(router.state.location.href).toBe('/policies/terms-of-service'),
      dashboardLazyPageTimeout,
    );

    expect(
      await view.findByRole(
        'heading',
        { name: 'Terms of Service', level: 1 },
        dashboardLazyPageTimeout,
      ),
    ).toBeTruthy();
  });

  it('react-ssr renders, serializes, and hydrates consistently', async () => {
    ssrEvents.length = 0;
    const html = await renderRequest('/ssr/users/11?tab=settings');

    expect(html).toContain('User 11');
    expect(html).toContain('window.__COOKBOOK_ROUTER__');
    expect(ssrEvents).toContain('middleware:/ssr/users/11');

    const staticRouter = createStaticRouter({
      routes: ssrRoutes,
      url: '/ssr/users/11?tab=settings',
    });
    await staticRouter.start();
    const hydrationData = deserializeRouterState(serializeRouterState(staticRouter));
    const clientRouter = createMemoryRouter({ routes: ssrRoutes, hydrationData });
    const container = document.createElement('div');
    container.innerHTML = renderToString(<SsrApp router={staticRouter} staticRender />);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await act(async () => {
        hydrateRoot(container, <SsrApp router={clientRouter} />);
      });
      expect(container.textContent).toContain('User 11');
      expect(clientRouter.state.location.href).toBe('/ssr/users/11?tab=settings');
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
