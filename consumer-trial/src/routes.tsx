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
      view: RootLayout,
      slots: {
        sidebar: {
          view: RootSidebarFallback,
          meta: {
            title: 'Sidebar',
          },
          routes: [
            {
              id: 'root.sidebar.user',
              path: 'users/{id:int}',
              view: UserSidebar,
              meta: {
                title: 'User sidebar',
              },
            },
          ],
        },
        modal: true,
      },
    },
    children: [
      {
        id: 'home',
        index: true,
        view: HomePage,
        meta: {
          title: 'Home',
        },
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: { type: 'string', optional: true },
          preview: { type: 'string', optional: true },
        },
        hash: { type: 'enum', values: ['profile', 'settings'], optional: true },
        view: UserPage,
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
        view: LoginPage,
        meta: {
          title: 'Login',
        },
      },
      {
        id: 'private.dashboard',
        path: 'private',
        view: PrivateDashboardPage,
        meta: {
          title: 'Private dashboard',
          requiresAuth: true,
        },
      },
      {
        id: 'blog',
        path: 'blog',
        layout: {
          view: BlogLayout,
          slots: {
            modal: true,
          },
        },
        intercepts: {
          modal: {
            to: 'blog.posts.show',
            view: BlogPostModal,
          },
        },
        children: [
          {
            id: 'blog.index',
            index: true,
            view: BlogIndexPage,
            meta: {
              title: 'Blog',
            },
          },
        ],
      },
      {
        id: 'blog.posts.show',
        path: '/blog/{slug:regex([a-z0-9-]+)}',
        view: BlogPostPage,
        meta: {
          title: 'Blog post',
        },
      },
    ],
  },
] as const);
