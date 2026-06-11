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
      view: BlogLayout,
      slots: {
        sidebar: {
          view: BlogSidebar,
          meta: {
            title: 'Reader sidebar',
          },
        },
        preview: {
          view: ArticlePreviewPanel,
          meta: {
            title: 'Article preview',
          },
        },
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: 'blog.articles.show',
        view: ArticleModal,
      },
    },
    meta: {
      title: 'Cookbook Journal',
    },
    children: [
      {
        id: 'blog.home',
        index: true,
        view: BlogHomePage,
        search: {
          query: { type: 'string', optional: true },
        },
        meta: {
          title: 'Home',
        },
      },
      {
        id: 'blog.articles',
        path: 'articles',
        view: ArticlesPage,
        search: {
          query: { type: 'string', optional: true },
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
        view: ArticlePage,
        loading: ArticleLoading,
        error: ArticleErrorFallback,
        search: {
          ref: { type: 'string', optional: true },
          filters: { type: 'string', many: true, optional: true },
        },
        hash: { type: 'enum', values: ['comments', 'share'], optional: true },
        meta: {
          title: 'Article',
        },
      },
      {
        id: 'blog.archive',
        path: 'archive',
        view: ArchivePage,
        meta: {
          title: 'Archive',
        },
      },
      {
        id: 'blog.members',
        path: 'members',
        view: MembersPage,
        middleware: [requireAuth],
        meta: {
          title: 'Editorial desk',
          requiresAuth: true,
        },
      },
      {
        id: 'blog.login',
        path: 'login',
        view: LoginPage,
        search: {
          redirect: { type: 'string', optional: true },
        },
        meta: {
          title: 'Login',
        },
      },
    ],
  },
] as const);
