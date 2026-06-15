import { describe, expectTypeOf, it } from 'vitest';
import type {
  RouteHashInput,
  RouteId,
  RouteParams,
  RouteSearch,
  RouteUrlOptions,
} from '@cookbook/router';
describe('generated contracts in the consumer trial', () => {
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
    expectTypeOf<RouteParams<'users.show'>>().toEqualTypeOf<{ id: number }>();
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
