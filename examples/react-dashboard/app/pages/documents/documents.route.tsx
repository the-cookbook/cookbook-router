import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { LayoutPage } from '../layout';

export const AsyncDocumentsPage = lazyRouteView(() =>
  import('./page').then(async ({ DocumentsPage }) => ({
    default: DocumentsPage,
  }))
);

export const AsyncDocumentsLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ DocumentsLayoutHeader }) => ({
    default: DocumentsLayoutHeader,
  }))
);

export const documentsRoute = defineRoute({
  id: 'documents',
  parent: 'main',
  path: 'documents',
  layout: {
    view: LayoutPage,
    slots: {
      header: true,
    },
  },
  children: [
    {
      id: 'documents.index',
      index: true,
      view: AsyncDocumentsPage,
      layout: {
        slots: {
          header: AsyncDocumentsLayoutHeader,
        },
      },
    },
  ],
} as const);
