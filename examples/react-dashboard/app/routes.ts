import React from 'react';
import { defineRoutes, createConstraint } from '@cookbook/router';

import { RootLayoutPage, LayoutPage } from './pages/layout';
import { NotFound } from './pages/not-found/page';
import { ErrorPage } from './pages/error';
import { LoadingSkeleton } from './pages/loading';
import LoginPage from './pages/login/page';
import { PoliciesLayoutPage } from './pages/policies/layout';
import { PoliciesPageSkeleton } from './pages/policies/loading';

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

/************* CREATE *************/

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

const AsyncCreatePage = React.lazy(() =>
  import('./pages/create/page').then(async ({ CreatePage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: CreatePage,
    };
  })
);

/************* SEND EMSSAGE *************/
const AsyncSendMessageLayoutHeader = React.lazy(() =>
  import('./pages/messages/new/page').then(
    async ({ NewMessageLayoutHeader }) => ({
      default: NewMessageLayoutHeader,
    })
  )
);
const AsyncSendMessagePage = React.lazy(() =>
  import('./pages/messages/new/page').then(async ({ NewMessagePage }) => ({
    default: NewMessagePage,
  }))
);

const AsyncSendMessageModalPage = React.lazy(() =>
  import('./pages/messages/new/page').then(async ({ NewMessageModalPage }) => ({
    default: NewMessageModalPage,
  }))
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

/************* DOCUMENTS *************/
const AsyncDocumentsPage = React.lazy(() =>
  import('./pages/documents/page').then(async ({ DocumentsPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: DocumentsPage,
    };
  })
);

const AsyncDocumentsLayoutHeader = React.lazy(() =>
  import('./pages/documents/page').then(async ({ DocumentsLayoutHeader }) => ({
    default: DocumentsLayoutHeader,
  }))
);

/************* DOCUMENTS DETAILS *************/
const AsyncDocumentDetailPage = React.lazy(() =>
  import('./pages/documents/details/page').then(
    async ({ DocumentDetailPage }) => {
      await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

      return {
        default: DocumentDetailPage,
      };
    }
  )
);

const AsyncDocumentDetailLayoutHeader = React.lazy(() =>
  import('./pages/documents/details/page').then(
    async ({ DocumentDetailLayoutHeader }) => ({
      default: DocumentDetailLayoutHeader,
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

const AsyncReportsSidebarWidget = React.lazy(() =>
  import('./pages/reports/sidebar').then(async ({ ReportsSidebarWidget }) => ({
    default: ReportsSidebarWidget,
  }))
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

/************* Policies *************/

const AsyncTermsOfServicePage = React.lazy(() =>
  import('./pages/policies/terms-of-service/page').then(
    async ({ TermsOfServicePage }) => ({
      default: TermsOfServicePage,
    })
  )
);
const AsyncPrivacyPolicyPage = React.lazy(() =>
  import('./pages/policies/privacy-policy/page').then(
    async ({ PrivacyPolicyPage }) => ({
      default: PrivacyPolicyPage,
    })
  )
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
      layout: {
        view: RootLayoutPage,
        loading: LoadingSkeleton,
        slots: {
          header: true,
          sidebar: true,
          modal: true,
        },
      },
      intercepts: {
        modal: {
          to: ['new-message'],
          view: AsyncSendMessageModalPage,
        },
      },
      children: [
        {
          id: 'entry.redirect',
          index: true,
          redirect: {
            route: 'overview',
          },
        },
        {
          id: 'create',
          path: '/create',
          layout: {
            view: LayoutPage,
            slots: {
              header: AsyncCreateLayoutHeader,
            },
          },
          view: AsyncCreatePage,
        },
        {
          id: 'new-message',
          path: '/messages/new',
          layout: {
            view: LayoutPage,
            slots: {
              header: AsyncSendMessageLayoutHeader,
            },
          },
          view: AsyncSendMessagePage,
        },
        {
          id: 'overview',
          path: '/overview',
          view: AsyncOverviewPage,
          layout: {
            view: LayoutPage,
            slots: {
              header: AsyncOverviewLayoutHeader,
            },
          },
          intercepts: {
            modal: {
              to: 'create',
              view: AsyncOverviewCreateModal,
            },
          },
          search: {
            page: { type: 'number', default: 0 },
            pageSize: { type: 'number', optional: true },
            visitors: { type: 'string', optional: true },
          },
        },
        {
          id: 'users',
          path: '/users',
          layout: {
            view: LayoutPage,
            slots: {
              header: AsyncUsersLayoutHeader,
            },
          },
          children: [
            {
              id: 'users.index',
              index: true,
              view: AsyncUsersPage,
              search: {
                page: { type: 'number', optional: true },
                pageSize: { type: 'number', optional: true },
                status: { type: 'string', default: 'all' },
                role: {
                  type: 'string',
                  optional: true,
                },
                q: { type: 'string', optional: true },
              },
            },
            {
              id: 'users.details',
              path: '{slug:slug}',
              view: AsyncUserDetailPage,
              layout: {
                slots: {
                  header: AsyncUserDetailsLayoutHeader,
                },
              },
            },
          ],
        },
        {
          id: 'documents',
          path: '/documents',
          layout: {
            view: LayoutPage,
            loading: LoadingSkeleton,
            slots: {
              header: true,
            },
          },
          children: [
            {
              id: 'documents.index',
              index: true,
              view: AsyncDocumentsPage,
              layout: {
                slots: {
                  header: AsyncDocumentsLayoutHeader,
                },
              },
            },
            {
              id: 'documents.details',
              path: '/{documentId:slug}',
              view: AsyncDocumentDetailPage,
              layout: {
                slots: {
                  header: AsyncDocumentDetailLayoutHeader,
                },
              },
            },
          ],
        },
        {
          id: 'reports',
          path: '/reports',
          view: AsyncReportsPage,
          layout: {
            view: LayoutPage,
            loading: LoadingSkeleton,
            slots: {
              header: AsyncReportsLayoutHeader,
              sidebar: AsyncReportsSidebarWidget,
            },
          },
        },
        {
          id: 'broken-page',
          path: '/broken-page',
          view: AsyncBrokenPage,
          layout: {
            view: LayoutPage,
            loading: LoadingSkeleton,
            error: ErrorPage,
          },
        },
        {
          id: 'policies',
          path: '/policies',
          layout: {
            view: PoliciesLayoutPage,
            loading: PoliciesPageSkeleton,
          },
          meta: {
            access: 'public',
          },
          children: [
            {
              id: 'terms-of-service',
              path: '/terms-of-service',
              view: AsyncTermsOfServicePage,
              meta: {
                access: 'public',
              },
            },
            {
              id: 'privacy-policy',
              path: '/privacy-policy',
              view: AsyncPrivacyPolicyPage,
              meta: {
                access: 'public',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'login',
      path: '/login',
      layout: {
        view: RootLayoutPage,
      },
      view: LoginPage,
      search: {
        redirect: { type: 'string', optional: true },
      },
      meta: {
        access: 'public',
      },
    },
    {
      id: 'not-found',
      path: '/{*path}',
      view: NotFound,
      meta: {
        access: 'public',
      },
      layout: {
        view: RootLayoutPage,
      },
    },
  ] as const,
  { pathConstraints: constraints }
);
