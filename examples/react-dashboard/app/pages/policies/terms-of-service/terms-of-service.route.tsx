import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';

const AsyncTermsOfServicePage = lazyRouteView(() =>
  import('./page').then(async ({ TermsOfServicePage }) => ({
    default: TermsOfServicePage,
  }))
);

export const termsOfServiceRoute = defineRoute({
  id: 'terms-of-service',
  parent: 'policies',
  path: 'terms-of-service',
  view: AsyncTermsOfServicePage,
  meta: {
    access: 'public',
  },
} as const);
