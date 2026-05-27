import { defineRoutes, createConstraint } from '@cookbook/router';

import { LayoutPage } from './pages/layout';
import {
  OverviewLayoutHeader,
  OverviewPage,
  OverviewCreateModal,
} from './pages/overview/page';
import { UsersLayoutHeader, UsersPage } from './pages/users/page';
import { CreateLayoutHeader, CreatePage } from './pages/create/page';
import {
  UserDetailsLayoutHeader,
  UserDetailPage,
} from './pages/users/details/page';
import { NotFound } from './pages/not-found/page';
import { ReportsLayoutHeader, ReportsPage } from './pages/reports/page';

export const constraints = {
  slug: createConstraint({
    parse: (paramName, value) => {
      if (typeof value !== 'string') {
        throw new Error(`Parameter "${paramName}" must be a string`);
      }

      if (!/^[a-z0-9-]+$/.test(value)) {
        throw new Error(`Parameter "${paramName}" must be a valid slug`);
      }
    },

    verify: (paramName, params) => {
      if (params.trim().length) {
        throw new Error(
          `[Constraint] Constraint 'slug' declared for '${paramName}' does not accept parameters, ` +
            `but received '${params}'.`
        );
      }
    },

    toRegExp: () => '[a-z0-9-]+',
  }),
};

export const routes = defineRoutes(
  [
    {
      id: 'entry',
      path: '/',
      redirect: {
        route: 'overview',
      },
    },
    {
      id: 'create',
      path: '/create',
      layout: {
        component: LayoutPage,
        slots: {
          header: {
            fallback: {
              id: 'create.header.fallback',
              component: CreateLayoutHeader,
            },
          },
        },
      },
      component: CreatePage,
    },
    {
      id: 'overview',
      path: '/overview',
      component: OverviewPage,
      layout: {
        component: LayoutPage,
        slots: {
          header: {
            fallback: {
              id: 'dashboard.header.fallback',
              component: OverviewLayoutHeader,
            },
          },
          modal: {
            fallback: null,
          },
        },
      },
      intercepts: {
        modal: {
          to: ['/create'],
          component: OverviewCreateModal,
        },
      },
      search: {
        visitors: { type: 'one', optional: true },
      },
    },
    {
      id: 'users',
      path: 'users',
      layout: {
        component: LayoutPage,
        slots: {
          header: {
            fallback: {
              id: 'users.header.fallback',
              component: UsersLayoutHeader,
            },
          },
        },
      },
      children: [
        {
          id: 'users.index',
          index: true,
          component: UsersPage,
        },
        {
          id: 'users.details',
          path: '{slug:slug}',
          component: UserDetailPage,
          layout: {
            slots: {
              header: {
                fallback: {
                  id: 'dashboard.users.details.header.fallback',
                  component: UserDetailsLayoutHeader,
                },
              },
            },
          },
        },
      ],
    },
    {
      id: 'reports',
      path: 'reports',
      component: ReportsPage,
      layout: {
        component: LayoutPage,
        slots: {
          header: {
            fallback: {
              id: 'reports.header.fallback',
              component: ReportsLayoutHeader,
            },
          },
        },
      },
    },
    {
      id: 'not-found',
      path: 'not-found',
      component: NotFound,
    },
  ] as const,
  { pathConstraints: constraints }
);
