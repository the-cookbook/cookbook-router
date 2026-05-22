import { defineRoutes } from '@cookbook/router';
import type { Middleware } from '@cookbook/router';
import { isAuthenticated } from './auth';
import {
  ArticleModal,
  ArticlePage,
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
          fallback: {
            id: 'blog.sidebar.fallback',
            component: BlogSidebar,
            meta: {
              title: 'Reader sidebar',
            },
          },
        },
        preview: {
          fallback: {
            id: 'blog.preview.fallback',
            component: ArticlePreviewPanel,
            meta: {
              title: 'Article preview',
            },
          },
        },
        modal: {
          fallback: null,
        },
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
          query: 'optional-string',
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
          query: 'optional-string',
        },
        layout: {
          slots: {
            sidebar: {
              fallback: {
                id: 'articles.sidebar.fallback',
                component: ArticleSidebar,
              },
            },
            preview: false,
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
        search: {
          ref: 'optional-string',
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
          redirect: 'optional-string',
        },
        meta: {
          title: 'Login',
        },
      },
    ],
  },
] as const);
