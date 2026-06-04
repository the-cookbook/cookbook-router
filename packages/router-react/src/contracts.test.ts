import { describe, expectTypeOf, it } from 'vitest';
import type { RouteHash, RouteId, RouteOutletContext, RouteParams, RouteSearch } from './contracts';

declare module '@cookbook/router' {
  interface Register {
    contracts: {
      paths: {
        home: '/';
        user: '/users/{id:int}';
        'dashboard.home': '/dashboard';
        'dashboard.sidebar.activity': '/dashboard/activity/{id:int}';
        'dashboard.reports': '/dashboard/reports';
        settings: '/settings';
        'users.show': '/users/{id:int}';
        'modal.source': '/modal-source';
        'modal.source.index': '/modal-source';
        'modal.target': '/modal-target';
        'blog.articles': '/blog/articles';
        'blog.articles.show': '/blog/articles/{slug:regex([a-z0-9-]+)}';
        products: '/products';
        article: '/articles/{slug:slug}';
      };
      params: {
        home: Record<string, never>;
        user: { id: number };
        'dashboard.home': Record<string, never>;
        'dashboard.sidebar.activity': { id: number };
        'dashboard.reports': Record<string, never>;
        settings: Record<string, never>;
        'users.show': { id: number };
        'modal.source': Record<string, never>;
        'modal.source.index': Record<string, never>;
        'modal.target': Record<string, never>;
        'blog.articles': Record<string, never>;
        'blog.articles.show': { slug: string };
        products: Record<string, never>;
        article: { slug: string };
      };
      search: {
        home: Record<string, never>;
        user: { tab?: string; empty?: string };
        'dashboard.home': Record<string, never>;
        'dashboard.sidebar.activity': Record<string, never>;
        'dashboard.reports': Record<string, never>;
        settings: Record<string, never>;
        'users.show': Record<string, never>;
        'modal.source': Record<string, never>;
        'modal.source.index': Record<string, never>;
        'modal.target': Record<string, never>;
        'blog.articles': Record<string, never>;
        'blog.articles.show': { ref?: string };
        products: { page?: number; tags?: readonly string[] };
        article: Record<string, never>;
      };
      hash: {
        home: never;
        user: 'profile' | 'settings' | 'bio' | 'top';
        'dashboard.home': never;
        'dashboard.sidebar.activity': never;
        'dashboard.reports': never;
        settings: never;
        'users.show': never;
        'modal.source': never;
        'modal.source.index': never;
        'modal.target': never;
        'blog.articles': never;
        'blog.articles.show': never;
        products: never;
        article: never;
      };
      outletContext: {
        'dashboard.home': { user: string };
        'modal.target': { source: string };
      };
    };
  }
}

describe('router-react contracts', () => {
  it('reads route contracts from @cookbook/router module augmentation', () => {
    expectTypeOf<RouteId>().toEqualTypeOf<
      | 'home'
      | 'user'
      | 'dashboard.home'
      | 'dashboard.sidebar.activity'
      | 'dashboard.reports'
      | 'settings'
      | 'users.show'
      | 'modal.source'
      | 'modal.source.index'
      | 'modal.target'
      | 'blog.articles'
      | 'blog.articles.show'
      | 'products'
      | 'article'
    >();
    expectTypeOf<RouteParams<'blog.articles.show'>>().toEqualTypeOf<{ slug: string }>();
    expectTypeOf<RouteSearch<'blog.articles.show'>>().toEqualTypeOf<{ ref?: string }>();
    expectTypeOf<RouteParams<'user'>>().toEqualTypeOf<{ id: number }>();
    expectTypeOf<RouteSearch<'user'>>().toEqualTypeOf<{ tab?: string; empty?: string }>();
    expectTypeOf<RouteHash<'user'>>().toEqualTypeOf<'profile' | 'settings' | 'bio' | 'top'>();
    expectTypeOf<RouteOutletContext<'dashboard.home'>>().toEqualTypeOf<{ user: string }>();
    expectTypeOf<RouteOutletContext<'modal.target'>>().toEqualTypeOf<{ source: string }>();
  });
});
