import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { LAZY_PAGE_DELAY_MS } from '@/lib/routes/config';
import { LayoutPage } from '../layout';

export const AsyncReportsPage = lazyRouteView(() =>
  import('./page').then(async ({ ReportsPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: ReportsPage,
    };
  })
);

export const AsyncReportsSidebarWidget = lazyRouteView(() =>
  import('./sidebar').then(async ({ ReportsSidebarWidget }) => ({
    default: ReportsSidebarWidget,
  }))
);

export const AsyncReportsLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ ReportsLayoutHeader }) => ({
    default: ReportsLayoutHeader,
  }))
);

export const reportsRoute = defineRoute({
  id: 'reports',
  parent: 'main',
  path: 'reports',
  view: AsyncReportsPage,
  layout: {
    view: LayoutPage,
    slots: {
      header: AsyncReportsLayoutHeader,
      sidebar: AsyncReportsSidebarWidget,
    },
  },
} as const);
