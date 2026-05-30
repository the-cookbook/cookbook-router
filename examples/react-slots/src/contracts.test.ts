import { describe, expectTypeOf, it } from 'vitest';
import { useHashParams, useParams, useSearchParams } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteParams,
  RoutePaths,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-slots generated contracts', () => {
  it('exposes generated route IDs, params, hash values, and paths', () => {
    expectTypeOf<RouteParams['entry']>().toEqualTypeOf<{}>();
    expectTypeOf<RouteParams['dashboard.activity']>().toEqualTypeOf<{}>();
    expectTypeOf<RouteHash['dashboard.activity']>().toEqualTypeOf<never>();
    expectTypeOf<RoutePaths['entry']>().toEqualTypeOf<'/'>();
    expectTypeOf<RoutePaths['dashboard.activity']>().toEqualTypeOf<'/dashboard/activity'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  it('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('dashboard.activity');
      const search = useSearchParams('dashboard.activity');
      const hash = useHashParams('dashboard.activity');

      expectTypeOf(params).toEqualTypeOf<{}>();
      expectTypeOf(search).toEqualTypeOf<{}>();
      expectTypeOf(hash).toEqualTypeOf<never | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
