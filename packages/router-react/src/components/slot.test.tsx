import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes, type Router } from '@cookbook/router';
import { describe, expect, test, vi } from 'vitest';
import { Link } from './link';
import { Outlet } from './outlet';
import { RouterProvider } from './router-provider';
import type { RouterErrorFallbackProps } from './router-provider';
import { Slot } from './slot';
import { useOutletContext } from '../hooks/use-outlet-context';
import { useParams } from '../hooks/use-params';

function DashboardLayout() {
  return (
    <section>
      <p>dashboard-layout</p>
      <Slot name="sidebar" context={{ source: 'dashboard-slot' }} />
      <Slot name="modal" />
      <Slot name="inspector" />
      <Outlet />
    </section>
  );
}

function NestedLayout() {
  return (
    <article>
      <p>nested-layout</p>
      <Slot name="sidebar" />
      <Outlet />
    </article>
  );
}

function DashboardPage() {
  return <h1>dashboard</h1>;
}

function ActivityPage() {
  return <h1>activity-page</h1>;
}

function SidebarFallback() {
  const context = useOutletContext<{ source: string }>();
  return <aside>fallback:{context.source}</aside>;
}

function ActivitySidebar() {
  const context = useOutletContext<{ source: string }>();
  const params = useParams('dashboard.sidebar.activity');
  return (
    <aside>
      activity-sidebar:{context.source}:{params.id}
    </aside>
  );
}

function ModalPage() {
  const context = useOutletContext<{ source: string }>();
  return <aside>modal:{context.source}</aside>;
}

function ModalSourcePage() {
  return (
    <Link to="modal.target" intercept="modal" context={{ source: 'navigation-context' }}>
      open modal
    </Link>
  );
}

function AutoModalSourcePage() {
  return (
    <Link to="modal.target" context={{ source: 'automatic-navigation-context' }}>
      open modal automatically
    </Link>
  );
}

function SettingsSidebar() {
  return <aside>settings-sidebar</aside>;
}

function NestedSidebar() {
  return <aside>nested-sidebar</aside>;
}

async function createRouter(initialEntries: readonly string[]): Promise<Router> {
  const router = createMemoryRouter({
    initialEntries,
    routes: defineRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          component: DashboardLayout,
          slots: {
            sidebar: {
              fallback: { id: 'dashboard.sidebar.fallback', component: SidebarFallback },
              routes: [
                {
                  id: 'dashboard.sidebar.activity',
                  path: 'activity/{id:int}',
                  component: ActivitySidebar,
                },
              ],
            },
            modal: { fallback: null },
            inspector: {
              routes: [
                { id: 'dashboard.inspector.details', path: 'inspect', component: ActivitySidebar },
              ],
            },
          },
        },
        children: [
          { id: 'dashboard.index', index: true, component: DashboardPage },
          { id: 'dashboard.activity', path: 'activity/{id:int}', component: ActivityPage },
          {
            id: 'dashboard.settings',
            path: 'settings',
            component: DashboardPage,
            layout: {
              slots: {
                sidebar: {
                  fallback: {
                    id: 'dashboard.settings.sidebar.fallback',
                    component: SettingsSidebar,
                  },
                },
              },
            },
          },
          {
            id: 'dashboard.fullscreen',
            path: 'fullscreen',
            component: DashboardPage,
            layout: {
              slots: {
                sidebar: false,
              },
            },
          },
          {
            id: 'dashboard.nested',
            path: 'nested',
            layout: {
              component: NestedLayout,
              slots: {
                sidebar: {
                  fallback: { id: 'dashboard.nested.sidebar.fallback', component: NestedSidebar },
                },
              },
            },
            children: [{ id: 'dashboard.nested.index', index: true, component: DashboardPage }],
          },
        ],
      },
    ] as const),
  });
  await router.resolveCurrent();
  return router;
}

describe('Slot', () => {
  test('renders slot fallback with direct slot context', async () => {
    const router = await createRouter(['/dashboard']);
    const { getByText, queryByText } = render(<RouterProvider router={router} />);

    expect(getByText('fallback:dashboard-slot')).toBeTruthy();
    expect(getByText('dashboard')).toBeTruthy();
  });

  test('renders URL-matched slot routes and exposes slot route params', async () => {
    const router = await createRouter(['/dashboard/activity/7']);
    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('activity-sidebar:dashboard-slot:7')).toBeTruthy();
    expect(getByText('activity-page')).toBeTruthy();
  });

  test('renders child slot fallback overrides', async () => {
    const router = await createRouter(['/dashboard/settings']);
    const { getByText, queryByText } = render(<RouterProvider router={router} />);

    expect(getByText('settings-sidebar')).toBeTruthy();
    expect(queryByText('fallback:dashboard-slot')).toBeNull();
  });

  test('renders nothing for disabled and fallback-null slots', async () => {
    const router = await createRouter(['/dashboard/fullscreen']);
    const { queryByText } = render(<RouterProvider router={router} />);

    expect(queryByText('fallback:dashboard-slot')).toBeNull();
    expect(queryByText('settings-sidebar')).toBeNull();
  });

  test('keeps nested same-name slots scoped to the layout owner', async () => {
    const router = await createRouter(['/dashboard/nested']);
    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('fallback:dashboard-slot')).toBeTruthy();
    expect(getByText('nested-sidebar')).toBeTruthy();
  });

  test('uses navigation context for intercepted slot renders before slot context', async () => {
    function ModalLayout() {
      return (
        <section>
          <Slot name="modal" context={{ source: 'slot-context' }} />
          <Outlet />
        </section>
      );
    }

    const router = createMemoryRouter({
      initialEntries: ['/modal-source'],
      routes: defineRoutes([
        {
          id: 'modal.source',
          path: '/modal-source',
          layout: {
            component: ModalLayout,
            slots: { modal: { fallback: null } },
          },
          intercepts: {
            modal: { to: ['/modal-target'], component: ModalPage },
          },
          children: [{ id: 'modal.source.index', index: true, component: ModalSourcePage }],
        },
        { id: 'modal.target', path: '/modal-target', component: ModalPage },
      ] as const),
    });
    await router.resolveCurrent();

    const view = render(<RouterProvider router={router} />);

    fireEvent.click(view.getByText('open modal'));

    await waitFor(() => expect(view.getByText('modal:navigation-context')).toBeTruthy());
    expect(view.queryByText('modal:slot-context')).toBeNull();
  });

  test('automatically renders configured intercepts from Link navigation', async () => {
    function ModalLayout() {
      return (
        <section>
          <Slot name="modal" context={{ source: 'slot-context' }} />
          <Outlet />
        </section>
      );
    }

    const router = createMemoryRouter({
      initialEntries: ['/modal-source'],
      routes: defineRoutes([
        {
          id: 'modal.source',
          path: '/modal-source',
          layout: {
            component: ModalLayout,
            slots: { modal: { fallback: null } },
          },
          intercepts: {
            modal: { to: ['/modal-target'], component: ModalPage },
          },
          children: [{ id: 'modal.source.index', index: true, component: AutoModalSourcePage }],
        },
        { id: 'modal.target', path: '/modal-target', component: ModalPage },
      ] as const),
    });
    await router.resolveCurrent();

    const view = render(<RouterProvider router={router} />);

    fireEvent.click(view.getByText('open modal automatically'));

    await waitFor(() => expect(view.getByText('modal:automatic-navigation-context')).toBeTruthy());
    expect(view.getByText('open modal automatically')).toBeTruthy();
    expect(router.state.location.href).toBe('/modal-target');
    expect(router.state.previousLocation?.href).toBe('/modal-source');
  });

  test('opens the nested canonical route from inside an active configured intercept without reintercepting', async () => {
    function BlogLayout() {
      return (
        <section>
          <Slot name="modal" />
          <Outlet />
        </section>
      );
    }

    function ArticlesPage() {
      return (
        <main>
          <p>articles list</p>
          <Link to="blog.articles.show" params={{ slug: 'hello-world' }}>
            open article modal
          </Link>
        </main>
      );
    }

    function ArticleModal() {
      const params = useParams('blog.articles.show');

      return (
        <aside>
          <p>article modal:{params.slug}</p>
          <Link
            to="blog.articles.show"
            params={{ slug: params.slug }}
            search={{ ref: 'modal-full-page' }}
          >
            open full page
          </Link>
        </aside>
      );
    }

    function ArticlePage() {
      return <h1>canonical article page</h1>;
    }

    const router = createMemoryRouter({
      initialEntries: ['/blog/articles'],
      routes: defineRoutes([
        {
          id: 'blog',
          path: '/blog',
          layout: {
            component: BlogLayout,
            slots: { modal: { fallback: null } },
          },
          intercepts: {
            modal: { to: ['articles/{slug:regex([a-z0-9-]+)}'], component: ArticleModal },
          },
          children: [
            { id: 'blog.articles', path: 'articles', component: ArticlesPage },
            {
              id: 'blog.articles.show',
              path: 'articles/{slug:regex([a-z0-9-]+)}',
              component: ArticlePage,
              search: { ref: { type: 'one', optional: true } },
            },
          ],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const view = render(<RouterProvider router={router} />);

    fireEvent.click(view.getByText('open article modal'));
    await waitFor(() => expect(view.getByText('article modal:hello-world')).toBeTruthy());

    fireEvent.click(view.getByText('open full page'));

    await waitFor(() => expect(view.getByText('canonical article page')).toBeTruthy());
    expect(view.queryByText('article modal:hello-world')).toBeNull();
    expect(view.queryByText('articles list')).toBeNull();
    expect(router.state.location.href).toBe('/blog/articles/hello-world?ref=modal-full-page');
    expect(router.state.match?.intercepted).toBeUndefined();
  });

  test('missing slot references render null instead of throwing', async () => {
    function MissingSlotLayout() {
      return (
        <section>
          <Slot name="missing" />
          <Outlet />
        </section>
      );
    }

    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          layout: {
            component: MissingSlotLayout,
            slots: { sidebar: { fallback: { component: SidebarFallback } } },
          },
          children: [{ id: 'home', index: true, component: DashboardPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText, queryByText } = render(<RouterProvider router={router} />);

    expect(getByText('dashboard')).toBeTruthy();
    expect(queryByText('fallback:dashboard-slot')).toBeNull();
  });
});

describe('Slot route provider fallbacks', () => {
  test('uses RouterProvider errorFallback for slot route render errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenSlot(): never {
      throw new Error('slot failed');
    }

    function GlobalError(props: RouterErrorFallbackProps) {
      return <p>global slot error:{props.route?.id}</p>;
    }

    const router = createMemoryRouter({
      initialEntries: ['/dashboard/broken'],
      routes: defineRoutes([
        {
          id: 'dashboard',
          path: '/dashboard',
          layout: {
            component: DashboardLayout,
            slots: {
              sidebar: {
                routes: [{ id: 'dashboard.sidebar.broken', path: 'broken', component: BrokenSlot }],
              },
            },
          },
          children: [{ id: 'dashboard.broken', path: 'broken', component: DashboardPage }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} errorFallback={GlobalError} />);

    expect(getByText('global slot error:dashboard.sidebar.broken')).toBeTruthy();
    consoleError.mockRestore();
  });

  test('uses RouterProvider errorFallback for intercepted route render errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function BrokenModal(): never {
      throw new Error('modal failed');
    }

    function GlobalError(props: RouterErrorFallbackProps) {
      return <p>global modal error:{props.route?.id}</p>;
    }

    function ModalLayout() {
      return (
        <section>
          <Slot name="modal" />
          <Outlet />
        </section>
      );
    }

    const router = createMemoryRouter({
      initialEntries: ['/modal-source'],
      routes: defineRoutes([
        {
          id: 'modal.source',
          path: '/modal-source',
          layout: {
            component: ModalLayout,
            slots: { modal: { fallback: null } },
          },
          intercepts: {
            modal: { to: ['/modal-target'], component: BrokenModal },
          },
          children: [{ id: 'modal.source.index', index: true, component: ModalSourcePage }],
        },
        { id: 'modal.target', path: '/modal-target', component: ModalPage },
      ] as const),
    });
    await router.resolveCurrent();

    const view = render(<RouterProvider router={router} errorFallback={GlobalError} />);

    fireEvent.click(view.getByText('open modal'));

    await waitFor(() => expect(view.getByText('global modal error:modal.target')).toBeTruthy());
    consoleError.mockRestore();
  });
});
