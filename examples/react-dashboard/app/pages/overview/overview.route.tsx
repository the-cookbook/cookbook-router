import { defineRoute, defineSearch, mergeSearch } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { paginationSearch } from '../../lib/routes/filters/pagination';
import { LAZY_PAGE_DELAY_MS } from '@/lib/routes/config';

import { LayoutPage } from '../layout';

export const AsyncOverviewPage = lazyRouteView(() =>
  import('./page').then(async ({ OverviewPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: OverviewPage,
    };
  })
);

export const AsyncOverviewLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ OverviewLayoutHeader }) => ({
    default: OverviewLayoutHeader,
  }))
);

export const AsyncOverviewCreateModal = lazyRouteView(() =>
  import('./page').then(async ({ OverviewCreateModal }) => ({
    default: OverviewCreateModal,
  }))
);

export const overviewSearch = defineSearch({
  visitors: { type: 'string', optional: true },
} as const);

export const overviewRoute = defineRoute({
  id: 'overview',
  parent: 'main',
  path: 'overview',
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
  search: mergeSearch(overviewSearch, paginationSearch),
} as const);
