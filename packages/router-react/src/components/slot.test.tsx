import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, defineRoutes, type Router } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { Link } from './link';
import { Outlet } from './outlet';
import { RouterProvider } from './router-provider';
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

function SettingsSidebar() {
  return <aside>settings-sidebar</aside>;
}

function NestedSidebar() {
  return <aside>nested-sidebar</aside>;
}

function SlotNotFound() {
  return <aside>slot-not-found</aside>;
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
              notFound: SlotNotFound,
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
    expect(queryByText('slot-not-found')).toBeTruthy();
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
