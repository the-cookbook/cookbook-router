import { describe, expectTypeOf, it } from 'vitest';
import { useHashParams, useParams, useSearchParams } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteParams,
  RoutePaths,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-ssr generated contracts', () => {
  it('exposes generated route IDs, params, hash values, and paths', () => {
    expectTypeOf<RouteParams['articles.show']>().toEqualTypeOf<{ slug: string }>();
    expectTypeOf<RouteParams['ssr.users.show']>().toEqualTypeOf<{ id: number }>();
    expectTypeOf<RouteHash['articles.show']>().toEqualTypeOf<'comments' | 'summary'>();
    expectTypeOf<
      RoutePaths['articles.show']
    >().toEqualTypeOf<'/articles/{slug:regex([a-z0-9-]+)}'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  it('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('articles.show');
      const userParams = useParams('ssr.users.show');
      const search = useSearchParams('articles.show');
      const hash = useHashParams('articles.show');

      expectTypeOf(params).toEqualTypeOf<{ slug: string }>();
      expectTypeOf(userParams).toEqualTypeOf<{ id: number }>();
      expectTypeOf(search).toEqualTypeOf<{ preview?: string }>();
      expectTypeOf(hash).toEqualTypeOf<'comments' | 'summary' | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
