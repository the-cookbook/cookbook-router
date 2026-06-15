import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';

const AsyncPrivacyPolicyPage = lazyRouteView(() =>
  import('./page').then(async ({ PrivacyPolicyPage }) => ({
    default: PrivacyPolicyPage,
  }))
);

export const privacyPolicyRoute = defineRoute({
  id: 'privacy-policy',
  parent: 'policies',
  path: 'privacy-policy',
  view: AsyncPrivacyPolicyPage,
  meta: {
    access: 'public',
  },
} as const);
