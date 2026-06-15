import { defineRoute } from '@cookbook/router';
import { lazyRouteView } from '@cookbook/router-react';
import { LayoutPage } from '@/pages/layout';

const AsyncSendMessageLayoutHeader = lazyRouteView(() =>
  import('./page').then(async ({ NewMessageLayoutHeader }) => ({
    default: NewMessageLayoutHeader,
  }))
);

const AsyncSendMessagePage = lazyRouteView(() =>
  import('./page').then(async ({ NewMessagePage }) => ({
    default: NewMessagePage,
  }))
);

export const newMessageRoute = defineRoute({
  id: 'new-message',
  parent: 'main',
  path: 'messages/new',
  layout: {
    view: LayoutPage,
    slots: {
      header: AsyncSendMessageLayoutHeader,
    },
  },
  view: AsyncSendMessagePage,
} as const);
