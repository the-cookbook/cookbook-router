import { defineRoutes } from '@cookbook/router';
import { BlockedPage, HomePage, ProductsPage, RootLayout, UserPage } from './pages';

export const lifecycleEvents: string[] = [];

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
          title: 'Home',
        },
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: { type: 'string', optional: true },
        },
        hash: { type: 'enum', values: ['profile', 'settings', 'security'], optional: true },
        component: UserPage,
        meta: {
          title: 'User',
          requiresAuth: true,
        },
        lifecycle: {
          beforeEnter: () => {
            lifecycleEvents.push('users.beforeEnter');
          },
          afterEnter: () => {
            lifecycleEvents.push('users.afterEnter');
          },
        },
      },
      {
        id: 'products',
        path: 'products',
        search: {
          tags: { type: 'string', many: true, optional: true },
        },
        url: {
          arrayFormat: 'comma',
        },
        component: ProductsPage,
        meta: {
          title: 'Products',
        },
      },
      {
        id: 'blocked',
        path: 'blocked',
        component: BlockedPage,
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
] as const);
