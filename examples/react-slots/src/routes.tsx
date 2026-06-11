import { defineRoutes } from '@cookbook/router';
import {
  ActivityPage,
  ActivitySidebar,
  DashboardLayout,
  DashboardSidebar,
  FullscreenPage,
  OverviewPage,
  SettingsPage,
  SettingsSidebar,
} from './pages';

export const routes = defineRoutes([
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
    layout: {
      view: DashboardLayout,
      slots: {
        sidebar: {
          view: DashboardSidebar,
          meta: {
            title: 'Default sidebar',
          },
          routes: [
            {
              id: 'dashboard.sidebar.activity',
              path: 'activity',
              view: ActivitySidebar,
              meta: {
                title: 'Activity sidebar',
              },
            },
          ],
        },
        modal: true,
      },
    },
    meta: {
      section: 'dashboard',
    },
    children: [
      {
        id: 'dashboard.overview',
        index: true,
        view: OverviewPage,
        meta: {
          title: 'Overview',
        },
      },
      {
        id: 'dashboard.activity',
        path: 'activity',
        view: ActivityPage,
        meta: {
          title: 'Activity',
        },
      },
      {
        id: 'dashboard.settings',
        path: 'settings',
        view: SettingsPage,
        layout: {
          slots: {
            sidebar: {
              view: SettingsSidebar,
              meta: {
                title: 'Settings sidebar',
              },
            },
          },
        },
        meta: {
          title: 'Settings',
        },
      },
      {
        id: 'dashboard.fullscreen',
        path: 'fullscreen',
        view: FullscreenPage,
        layout: {
          slots: {
            sidebar: true,
          },
        },
      },
    ],
  },
] as const);
