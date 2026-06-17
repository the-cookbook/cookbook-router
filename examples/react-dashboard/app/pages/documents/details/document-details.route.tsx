import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';

const AsyncDocumentDetailPage = lazyRouteView(() =>
  import('./page').then(async ({ DocumentDetailPage }) => ({
    default: DocumentDetailPage,
  }))
);

const AsyncDocumentDetailLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ DocumentDetailLayoutHeader }) => ({
    default: DocumentDetailLayoutHeader,
  }))
);

export const documentDetailsRoute = defineRoute({
  id: 'documents.details',
  parent: 'documents',
  path: '{documentId:slug}',
  view: AsyncDocumentDetailPage,
  layout: {
    slots: {
      header: AsyncDocumentDetailLayoutHeader,
    },
  },
} as const);
