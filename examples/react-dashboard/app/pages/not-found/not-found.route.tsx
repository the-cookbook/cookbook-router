import { defineRoute } from '@cookbook/router';

import { NotFound } from './page';

export const notFoundRoute = defineRoute({
  id: 'not-found',
  parent: 'main',
  path: '{*path}',
  view: NotFound,
  meta: {
    access: 'public',
  },
} as const);
