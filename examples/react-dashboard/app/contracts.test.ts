import { describe, expectTypeOf, it } from 'vitest';
import { useParams, useSearchParams } from '@cookbook/router-react';
import type {
  RouteParams,
  RoutePaths,
  RouteSearch,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-dashboard generated contracts', () => {
  it('exposes generated route IDs, custom slug params, search values, and paths', () => {
    expectTypeOf<RouteParams['users.details']>().toEqualTypeOf<{
      slug: string;
    }>();
    expectTypeOf<RouteSearch['overview']>().toEqualTypeOf<{
      page?: string | readonly string[];
      pageSize?: string | readonly string[];
      visitors?: string | readonly string[];
    }>();
    expectTypeOf<
      RoutePaths['users.details']
    >().toEqualTypeOf<'/users/{slug:slug}'>();
    expectTypeOf<RoutePaths['broken-page']>().toEqualTypeOf<'/broken-page'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  it('react hooks read generated dashboard contracts globally', () => {
    function assertHookInference() {
      const params = useParams('users.details');
      const search = useSearchParams('overview');

      expectTypeOf(params).toEqualTypeOf<{ slug: string }>();
      expectTypeOf(search).toEqualTypeOf<{
        page?: string | readonly string[];
        pageSize?: string | readonly string[];
        visitors?: string | readonly string[];
      }>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
