import { describe, expectTypeOf, test } from 'vitest';
import { useHash, useParams, useSearchParams } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteParams,
  RoutePaths,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-intercepts generated contracts', () => {
  test('exposes generated route IDs, params, hash values, and paths', () => {
    expectTypeOf<RouteParams['photos.show']>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<RouteHash['photos.show']>().toEqualTypeOf<'details' | 'comments'>();
    expectTypeOf<RoutePaths['photos.show']>().toEqualTypeOf<'/photos/{id:int}'>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  test('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('photos.show');
      const search = useSearchParams('photos.show');
      const hash = useHash('photos.show');

      expectTypeOf(params).toEqualTypeOf<{ id: string }>();
      expectTypeOf(search).toEqualTypeOf<{ source?: string | readonly string[] }>();
      expectTypeOf(hash).toEqualTypeOf<'details' | 'comments' | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
