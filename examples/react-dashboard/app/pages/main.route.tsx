import React from 'react';
import { defineRoute } from '@cookbook/router';

import { RootLayoutPage } from './layout';
import { LoadingSkeleton } from './loading';

export const AsyncSendMessageModalPage = React.lazy(() =>
  import('./messages/new/page').then(async ({ NewMessageModalPage }) => ({
    default: NewMessageModalPage,
  }))
);

export const entryRoute = defineRoute({
  id: 'main',
  path: '/',
  layout: {
    view: RootLayoutPage,
    loading: LoadingSkeleton,
    slots: {
      header: true,
      sidebar: true,
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: ['new-message'],
      view: AsyncSendMessageModalPage,
    },
  },
  children: [
    {
      id: 'main.redirect',
      index: true,
      redirect: {
        route: 'overview',
      },
    },
  ],
} as const);
