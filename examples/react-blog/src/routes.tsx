import { lazy } from 'react';
import { defineRoutes } from '@cookbook/router';
import type { Middleware } from '@cookbook/router';
import { isAuthenticated } from './auth';
import {
  ArticleErrorFallback,
  ArticleLoading,
  ArticleModal,
  ArticlePreviewPanel,
  ArticlesPage,
  ArchivePage,
  ArticleSidebar,
  BlogHomePage,
  BlogLayout,
  BlogSidebar,
  LoginPage,
  MembersPage,
} from './pages';

const ArticlePage = lazy(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  return import('./pages').then(({ ArticlePage }) => ({ default: ArticlePage }));
});

const requireAuth: Middleware = ({ location, redirect }) => {
  if (isAuthenticated()) {
    return undefined;
  }

  return redirect(`/blog/login?redirect=${encodeURIComponent(location.href)}`);
};

export const routes = defineRoutes([
  {
    id: 'entry',
    path: '/',
    redirect: {
      route: 'blog.home',
    },
  },
  {
    id: 'blog',
    path: '/blog',
    layout: {
      component: BlogLayout,
      slots: {
        sidebar: {
          component: BlogSidebar,
          meta: {
            title: 'Reader sidebar',
          },
        },
        preview: {
          component: ArticlePreviewPanel,
          meta: {
            title: 'Article preview',
          },
        },
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: ['articles/{slug:regex([a-z0-9-]+)}'],
        component: ArticleModal,
      },
    },
    meta: {
      title: 'Cookbook Journal',
    },
    children: [
      {
        id: 'blog.home',
        index: true,
        component: BlogHomePage,
        search: {
          query: { type: 'one', optional: true },
        },
        meta: {
          title: 'Home',
        },
      },
      {
        id: 'blog.articles',
        path: 'articles',
        component: ArticlesPage,
        search: {
          query: { type: 'one', optional: true },
        },
        layout: {
          slots: {
            sidebar: ArticleSidebar,
            preview: true,
          },
        },
        meta: {
          title: 'Articles',
        },
      },
      {
        id: 'blog.articles.show',
        path: 'articles/{slug:regex([a-z0-9-]+)}',
        component: ArticlePage,
        loading: ArticleLoading,
        error: ArticleErrorFallback,
        search: {
          ref: { type: 'one', optional: true },
          filters: { type: 'many', optional: true },
        },
        hash: ['comments', 'share'],
        meta: {
          title: 'Article',
        },
      },
      {
        id: 'blog.archive',
        path: 'archive',
        component: ArchivePage,
        meta: {
          title: 'Archive',
        },
      },
      {
        id: 'blog.members',
        path: 'members',
        component: MembersPage,
        middleware: [requireAuth],
        meta: {
          title: 'Editorial desk',
          requiresAuth: true,
        },
      },
      {
        id: 'blog.login',
        path: 'login',
        component: LoginPage,
        search: {
          redirect: { type: 'one', optional: true },
        },
        meta: {
          title: 'Login',
        },
      },
    ],
  },
] as const);
