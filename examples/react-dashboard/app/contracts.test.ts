import { describe, expectTypeOf, test } from 'vitest';
import { useParams, useSearch } from '@cookbook/router-react';
import type {
  RouteParams,
  RoutePaths,
  RouteSearch,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-dashboard generated contracts', () => {
  test('exposes generated route IDs, custom slug params, search values, and paths', () => {
    expectTypeOf<RouteParams['users.details']>().toEqualTypeOf<{
      slug: string;
    }>();
    expectTypeOf<RouteSearch['overview']>().toEqualTypeOf<{
      visitors?: string;
    }>();
    expectTypeOf<
      RoutePaths['users.details']
    >().toEqualTypeOf<'/users/{slug:slug}'>();
    expectTypeOf<RoutePaths['broken-page']>().toEqualTypeOf<'/broken-page'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  test('react hooks read generated dashboard contracts globally', () => {
    function assertHookInference() {
      const params = useParams('users.details');
      const search = useSearch('overview');

      expectTypeOf(params).toEqualTypeOf<{ slug: string }>();
      expectTypeOf(search).toEqualTypeOf<{ visitors?: string }>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
