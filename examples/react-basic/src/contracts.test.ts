import { describe, expectTypeOf, it } from 'vitest';
import { useHashParams, useParams, useSearchParams } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteParams,
  RoutePaths,
  RouteSearch,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-basic generated contracts', () => {
  it('exposes generated route IDs, params, hash values, and paths', () => {
    expectTypeOf<RouteParams['users.show']>().toEqualTypeOf<{ id: number }>();
    expectTypeOf<RouteSearch['products']>().toEqualTypeOf<{ tags?: readonly string[] }>();
    expectTypeOf<RouteHash['users.show']>().toEqualTypeOf<'profile' | 'settings' | 'security'>();
    expectTypeOf<RoutePaths['users.show']>().toEqualTypeOf<'/users/{id:int}'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  it('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('users.show');
      const search = useSearchParams('users.show');
      const hash = useHashParams('users.show');

      expectTypeOf(params).toEqualTypeOf<{ id: number }>();
      expectTypeOf(search).toEqualTypeOf<{ tab?: string }>();
      expectTypeOf(hash).toEqualTypeOf<'profile' | 'settings' | 'security' | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
