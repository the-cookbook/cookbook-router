import { describe, expectTypeOf, it } from 'vitest';
import type {
  RouteHashInput,
  RouteId,
  RouteMeta,
  RouteOutletContext,
  RouteParams,
  RouteSearch,
  RouteUrlOptions,
} from './contracts';

declare module './contracts' {
  interface Register {
    contracts: {
      params: {
        home: {};
        'users.show': { id: string };
      };
      search: {
        home: {};
        'users.show': { tab?: string };
      };
      hash: {
        home: never;
        'users.show': 'profile' | 'settings';
      };
      meta: {
        home: { title?: string };
        'users.show': { requiresAuth?: boolean };
      };
      paths: {
        home: '/';
        'users.show': '/users/{id:int}';
      };
      outletContext: {
        'users.show': { userId: string };
      };
    };
  }
}

describe('registered contracts', () => {
  it('narrows route IDs and route-specific values', () => {
    expectTypeOf<RouteId>().toEqualTypeOf<'home' | 'users.show'>();
    expectTypeOf<RouteParams<'users.show'>>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<RouteSearch<'users.show'>>().toEqualTypeOf<{ tab?: string }>();
    expectTypeOf<RouteHashInput<'users.show'>>().toEqualTypeOf<
      'profile' | 'settings' | '#profile' | '#settings' | null
    >();
    expectTypeOf<RouteMeta<'users.show'>>().toEqualTypeOf<{ requiresAuth?: boolean }>();
    expectTypeOf<RouteOutletContext<'users.show'>>().toEqualTypeOf<{ userId: string }>();
  });

  it('exposes a reusable URL options type for lower-boilerplate consumer APIs', () => {
    expectTypeOf<RouteUrlOptions<'users.show'>>().toEqualTypeOf<{
      readonly params?: { id: string };
      readonly search?: { tab?: string };
      readonly hash?: 'profile' | 'settings' | '#profile' | '#settings' | null;
    }>();
  });
});
