import { describe, expectTypeOf, test } from 'vitest';
import { useHash, useParams, useSearch } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteParams,
  RoutePaths,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-ssr generated contracts', () => {
  test('exposes generated route IDs, params, hash values, and paths', () => {
    expectTypeOf<RouteParams['articles.show']>().toEqualTypeOf<{ slug: string }>();
    expectTypeOf<RouteHash['articles.show']>().toEqualTypeOf<'comments' | 'summary'>();
    expectTypeOf<
      RoutePaths['articles.show']
    >().toEqualTypeOf<'/articles/{slug:regex([a-z0-9-]+)}'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  test('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('articles.show');
      const search = useSearch('articles.show');
      const hash = useHash('articles.show');

      expectTypeOf(params).toEqualTypeOf<{ slug: string }>();
      expectTypeOf(search).toEqualTypeOf<{ preview?: string }>();
      expectTypeOf(hash).toEqualTypeOf<'comments' | 'summary' | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
