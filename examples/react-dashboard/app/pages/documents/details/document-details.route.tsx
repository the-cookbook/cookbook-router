import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { LAZY_PAGE_DELAY_MS } from '@/lib/routes/config';

const AsyncDocumentDetailPage = lazyRouteView(() =>
  import('./page').then(async ({ DocumentDetailPage }) => {
    await new Promise((resolve) => setTimeout(resolve, LAZY_PAGE_DELAY_MS));

    return {
      default: DocumentDetailPage,
    };
  })
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
