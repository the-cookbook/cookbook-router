import { describe, expectTypeOf, test } from 'vitest';
import { useHash, useParams, useSearch } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteParams,
  RoutePaths,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-basic generated contracts', () => {
  test('exposes generated route IDs, params, hash values, and paths', () => {
    expectTypeOf<RouteParams['users.show']>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<RouteHash['users.show']>().toEqualTypeOf<'profile' | 'settings' | 'security'>();
    expectTypeOf<RoutePaths['users.show']>().toEqualTypeOf<'/users/{id:int}'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  test('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('users.show');
      const search = useSearch('users.show');
      const hash = useHash('users.show');

      expectTypeOf(params).toEqualTypeOf<{ id: string }>();
      expectTypeOf(search).toEqualTypeOf<{ tab?: string }>();
      expectTypeOf(hash).toEqualTypeOf<'profile' | 'settings' | 'security' | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
