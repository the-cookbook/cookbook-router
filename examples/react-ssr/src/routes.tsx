import { defineRoutes } from '@cookbook/router';
import { ArticlePage, HomePage, RootLayout, UserPage } from './pages';

export const ssrEvents: string[] = [];

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      component: RootLayout,
    },
    children: [
      {
        id: 'home',
        index: true,
        component: HomePage,
        meta: {
          title: 'SSR Home',
        },
      },
      {
        id: 'articles.show',
        path: 'articles/{slug:regex([a-z0-9-]+)}',
        search: {
          preview: { type: 'string', optional: true },
        },
        hash: { type: 'enum', values: ['comments', 'summary'], optional: true },
        component: ArticlePage,
        meta: {
          title: 'Article',
        },
      },
      {
        id: 'ssr.users.show',
        path: '/ssr/users/{id:int}',
        search: {
          tab: { type: 'string', optional: true },
        },
        component: UserPage,
        meta: {
          title: 'SSR User',
        },
      },
    ],
  },
] as const);
