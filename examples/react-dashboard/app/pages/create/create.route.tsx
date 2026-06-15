import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';

import { LayoutPage } from '../layout';

const AsyncCreateLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ CreateLayoutHeader }) => ({
    default: CreateLayoutHeader,
  }))
);

const AsyncCreatePage = lazyRouteView(() =>
  import('./page').then(async ({ CreatePage }) => ({
    default: CreatePage,
  }))
);

export const createRoute = defineRoute({
  id: 'create',
  parent: 'main',
  path: 'create',
  layout: {
    view: LayoutPage,
    slots: {
      header: AsyncCreateLayoutHeader,
    },
  },
  view: AsyncCreatePage,
} as const);
