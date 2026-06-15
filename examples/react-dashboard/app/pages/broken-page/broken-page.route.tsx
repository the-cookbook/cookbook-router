import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';

import { LayoutPage } from '../layout';
import { ErrorPage } from '../error';

const AsyncBrokenPage = lazyRouteView(() =>
  import('./page').then(async ({ BrokenPage }) => ({
    default: BrokenPage,
  }))
);

export const brokenPageRoute = defineRoute({
  id: 'broken-page',
  parent: 'main',
  path: 'broken-page',
  view: AsyncBrokenPage,
  layout: {
    view: LayoutPage,
    error: ErrorPage,
  },
} as const);
