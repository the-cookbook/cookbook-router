import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { LAZY_PAGE_DELAY_MS } from '@/lib/routes/config';

const AsyncUserDetailPage = lazyRouteView(() =>
  import('./page').then(async ({ UserDetailPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: UserDetailPage,
    };
  })
);

const AsyncUserDetailsLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ UserDetailsLayoutHeader }) => ({
    default: UserDetailsLayoutHeader,
  }))
);

export const userDetailsRoute = defineRoute({
  id: 'users.details',
  parent: 'users',
  path: '{slug:slug}',
  view: AsyncUserDetailPage,
  layout: {
    slots: {
      header: AsyncUserDetailsLayoutHeader,
    },
  },
} as const);
