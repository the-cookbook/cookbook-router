import { defineRoute } from '@cookbook/router';

import { PoliciesLayoutPage } from './layout';
import { PoliciesPageSkeleton } from './loading';

export const policiesRoute = defineRoute({
  id: 'policies',
  parent: 'main',
  path: 'policies',
  layout: {
    view: PoliciesLayoutPage,
    loading: PoliciesPageSkeleton,
  },
  meta: {
    access: 'public',
  },
} as const);
