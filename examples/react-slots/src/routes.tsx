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
      component: DashboardLayout,
      slots: {
        sidebar: {
          component: DashboardSidebar,
          meta: {
            title: 'Default sidebar',
          },
          routes: [
            {
              id: 'dashboard.sidebar.activity',
              path: 'activity',
              component: ActivitySidebar,
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
        component: OverviewPage,
        meta: {
          title: 'Overview',
        },
      },
      {
        id: 'dashboard.activity',
        path: 'activity',
        component: ActivityPage,
        meta: {
          title: 'Activity',
        },
      },
      {
        id: 'dashboard.settings',
        path: 'settings',
        component: SettingsPage,
        layout: {
          slots: {
            sidebar: {
              component: SettingsSidebar,
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
        component: FullscreenPage,
        layout: {
          slots: {
            sidebar: true,
          },
        },
      },
    ],
  },
] as const);
