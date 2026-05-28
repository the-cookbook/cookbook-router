import React from 'react';
import { defineRoutes, createConstraint } from '@cookbook/router';

import { LayoutPage } from './pages/layout';
import { NotFound } from './pages/not-found/page';
import { ErrorPage } from './pages/error';
import { LoadingSkeleton } from './pages/loading';

const LAZY_PAGE_DELAY_MS = 1_500;

/************* OVERVIEW *************/
const AsyncOverviewPage = React.lazy(() =>
  import('./pages/overview/page').then(async ({ OverviewPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: OverviewPage,
    };
  })
);

const AsyncOverviewLayoutHeader = React.lazy(() =>
  import('./pages/overview/page').then(async ({ OverviewLayoutHeader }) => ({
    default: OverviewLayoutHeader,
  }))
);

const AsyncOverviewCreateModal = React.lazy(() =>
  import('./pages/overview/page').then(async ({ OverviewCreateModal }) => ({
    default: OverviewCreateModal,
  }))
);

/************* CREATE *************/
const AsyncCreatePage = React.lazy(() =>
  import('./pages/create/page').then(async ({ CreatePage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: CreatePage,
    };
  })
);

const AsyncCreateLayoutHeader = React.lazy(() =>
  import('./pages/create/page').then(async ({ CreateLayoutHeader }) => ({
    default: CreateLayoutHeader,
  }))
);

/************* USERS *************/
const AsyncUsersPage = React.lazy(() =>
  import('./pages/users/page').then(async ({ UsersPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: UsersPage,
    };
  })
);

const AsyncUsersLayoutHeader = React.lazy(() =>
  import('./pages/users/page').then(async ({ UsersLayoutHeader }) => ({
    default: UsersLayoutHeader,
  }))
);

/************* USER DETAILS *************/
const AsyncUserDetailPage = React.lazy(() =>
  import('./pages/users/details/page').then(async ({ UserDetailPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: UserDetailPage,
    };
  })
);

const AsyncUserDetailsLayoutHeader = React.lazy(() =>
  import('./pages/users/details/page').then(
    async ({ UserDetailsLayoutHeader }) => ({
      default: UserDetailsLayoutHeader,
    })
  )
);

/************* REPORTS *************/
const AsyncReportsPage = React.lazy(() =>
  import('./pages/reports/page').then(async ({ ReportsPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: ReportsPage,
    };
  })
);

const AsyncReportsLayoutHeader = React.lazy(() =>
  import('./pages/reports/page').then(async ({ ReportsLayoutHeader }) => ({
    default: ReportsLayoutHeader,
  }))
);

/************* BROKEN PAGE *************/
const AsyncBrokenPage = React.lazy(() =>
  import('./pages/broken-page/page').then(async ({ BrokenPage }) => ({
    default: BrokenPage,
  }))
);

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
        loading: LoadingSkeleton,
        slots: {
          header: AsyncCreateLayoutHeader,
        },
      },
      component: AsyncCreatePage,
    },
    {
      id: 'overview',
      path: '/overview',
      component: AsyncOverviewPage,
      layout: {
        component: LayoutPage,
        loading: LoadingSkeleton,
        slots: {
          header: AsyncOverviewLayoutHeader,
          modal: true,
        },
      },
      intercepts: {
        modal: {
          to: 'create',
          component: AsyncOverviewCreateModal,
        },
      },
      search: {
        visitors: { type: 'one', optional: true },
      },
    },
    {
      id: 'users',
      path: '/users',
      layout: {
        component: LayoutPage,
        loading: LoadingSkeleton,
        slots: {
          header: AsyncUsersLayoutHeader,
        },
      },
      children: [
        {
          id: 'users.index',
          index: true,
          component: AsyncUsersPage,
        },
        {
          id: 'users.details',
          path: '{slug:slug}',
          component: AsyncUserDetailPage,
          layout: {
            slots: {
              header: AsyncUserDetailsLayoutHeader,
            },
          },
        },
      ],
    },
    {
      id: 'reports',
      path: '/reports',
      component: AsyncReportsPage,
      layout: {
        component: LayoutPage,
        loading: LoadingSkeleton,
        slots: {
          header: AsyncReportsLayoutHeader,
        },
      },
    },
    {
      id: 'broken-page',
      path: '/broken-page',
      component: AsyncBrokenPage,
      layout: {
        component: LayoutPage,
        loading: LoadingSkeleton,
        error: ErrorPage,
      },
    },
    {
      id: 'not-found',
      path: '/not-found',
      component: NotFound,
    },
  ] as const,
  { pathConstraints: constraints }
);
