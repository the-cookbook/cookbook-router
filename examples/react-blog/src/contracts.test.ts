import { describe, expectTypeOf, test } from 'vitest';
import { useHash, useParams, useSearchParams } from '@cookbook/router-react';
import type {
  RouteHash,
  RouteMeta,
  RouteParams,
  RoutePaths,
  RouterContracts,
} from '../.cookbook-router/contracts';

describe('react-blog generated contracts', () => {
  test('exposes generated route IDs, params, hash values, metadata, and paths', () => {
    expectTypeOf<RouteParams['blog.articles.show']>().toEqualTypeOf<{ slug: string }>();
    expectTypeOf<RouteHash['blog.articles.show']>().toEqualTypeOf<'comments' | 'share'>();
    expectTypeOf<
      RoutePaths['blog.articles.show']
    >().toEqualTypeOf<'/blog/articles/{slug:regex([a-z0-9-]+)}'>();
    expectTypeOf<RouteMeta['blog.members']>().toEqualTypeOf<{
      title?: string;
      requiresAuth?: boolean;
    }>();
    expectTypeOf<RouterContracts['paths']>().toExtend<RoutePaths>();
  });

  test('react hooks read generated router contracts globally', () => {
    function assertHookInference() {
      const params = useParams('blog.articles.show');
      const search = useSearchParams('blog.articles.show');
      const loginSearch = useSearchParams('blog.login');
      const hash = useHash('blog.articles.show');

      expectTypeOf(params).toEqualTypeOf<{ slug: string }>();
      expectTypeOf(search).toEqualTypeOf<{
        ref?: string | readonly string[];
        filters?: string | readonly string[];
      }>();
      expectTypeOf(loginSearch).toEqualTypeOf<{ redirect?: string | readonly string[] }>();
      expectTypeOf(hash).toEqualTypeOf<'comments' | 'share' | null>();
    }

    expectTypeOf(assertHookInference).toEqualTypeOf<() => void>();
  });
});
