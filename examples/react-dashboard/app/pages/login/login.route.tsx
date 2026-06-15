import { lazyRouteView } from '@cookbook/router-react';
import { defineRoute } from '@cookbook/router';
import Loading from './loading';

export const AsyncLoginPage = lazyRouteView(() => import('./page'));

export const loginRoute = defineRoute({
  id: 'login',
  parent: 'main',
  path: 'login',
  loading: Loading,
  view: AsyncLoginPage,
  search: {
    redirect: { type: 'string', optional: true },
  },
  meta: {
    access: 'public',
  },
} as const);
