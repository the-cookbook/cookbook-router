import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  RouteHashInput,
  RouteId,
  RouteParams,
  RouteSearch,
  RouteUrlOptions,
} from '@cookbook/router';
import { routeIds, routePaths } from '../.cookbook-router/contracts';

describe('generated contracts in the consumer trial', () => {
  it('exposes generated route ids and route paths', () => {
    expect(routeIds).toContain('users.show');
    expect(routeIds).toContain('blog.posts.show');
    expect(routePaths['users.show']).toBe('/users/{id:int}');
  });

  it('infers route ids, params, search, and hash from generated contracts', () => {
    expectTypeOf<RouteId>().toEqualTypeOf<
      | 'root'
      | 'root.sidebar.user'
      | 'home'
      | 'users.show'
      | 'login'
      | 'private.dashboard'
      | 'blog'
      | 'blog.index'
      | 'blog.posts.show'
    >();
    expectTypeOf<RouteParams<'users.show'>>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<RouteSearch<'users.show'>>().toEqualTypeOf<{ tab?: string; preview?: string }>();
    expectTypeOf<RouteHashInput<'users.show'>>().toEqualTypeOf<
      'profile' | 'settings' | '#profile' | '#settings' | null
    >();
    expectTypeOf<RouteUrlOptions<'blog.posts.show'>>().toEqualTypeOf<{
      readonly params?: { slug: string };
      readonly search?: {};
      readonly hash?: never;
    }>();
  });
});
