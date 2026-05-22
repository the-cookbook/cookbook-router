import { defineRoutes } from '@cookbook/router';
import {
  BlogIndexPage,
  BlogLayout,
  BlogPostModal,
  BlogPostPage,
  HomePage,
  LoginPage,
  PrivateDashboardPage,
  RootLayout,
  RootSidebarFallback,
  UserPage,
  UserSidebar,
} from './pages';

export const lifecycleEvents: string[] = [];

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      component: RootLayout,
      slots: {
        sidebar: {
          fallback: {
            id: 'root.sidebar.fallback',
            component: RootSidebarFallback,
            meta: {
              title: 'Sidebar',
            },
          },
          routes: [
            {
              id: 'root.sidebar.user',
              path: 'users/{id:int}',
              component: UserSidebar,
              meta: {
                title: 'User sidebar',
              },
            },
          ],
        },
        modal: {
          fallback: null,
        },
      },
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
          preview: { type: 'boolean', optional: true },
        },
        hash: ['profile', 'settings'],
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
        id: 'login',
        path: 'login',
        component: LoginPage,
        meta: {
          title: 'Login',
        },
      },
      {
        id: 'private.dashboard',
        path: 'private',
        component: PrivateDashboardPage,
        meta: {
          title: 'Private dashboard',
          requiresAuth: true,
        },
      },
      {
        id: 'blog',
        path: 'blog',
        layout: {
          component: BlogLayout,
          slots: {
            modal: {
              fallback: null,
            },
          },
        },
        intercepts: {
          modal: {
            to: ['{slug:regex([a-z0-9-]+)}'],
            component: BlogPostModal,
          },
        },
        children: [
          {
            id: 'blog.index',
            index: true,
            component: BlogIndexPage,
            meta: {
              title: 'Blog',
            },
          },
        ],
      },
      {
        id: 'blog.posts.show',
        path: '/blog/{slug:regex([a-z0-9-]+)}',
        component: BlogPostPage,
        meta: {
          title: 'Blog post',
        },
      },
    ],
  },
] as const);
