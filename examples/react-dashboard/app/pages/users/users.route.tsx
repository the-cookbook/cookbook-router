import { defineRoute, defineSearch, mergeSearch } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { LAZY_PAGE_DELAY_MS } from '@/lib/routes/config';
import { paginationSearch } from '../../lib/routes/filters/pagination';
import { LayoutPage } from '../layout';

const AsyncUsersLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ UsersLayoutHeader }) => ({
    default: UsersLayoutHeader,
  }))
);

const AsyncUsersPage = lazyRouteView(() =>
  import('./page').then(async ({ UsersPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: UsersPage,
    };
  })
);

const usersSearch = defineSearch({
  status: { type: 'string', default: 'all' },
  role: { type: 'string', optional: true },
  q: { type: 'string', optional: true },
} as const);

export const usersRoute = defineRoute({
  id: 'users',
  parent: 'main',
  path: 'users',
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
      search: mergeSearch(usersSearch, paginationSearch),
    },
  ],
} as const);
