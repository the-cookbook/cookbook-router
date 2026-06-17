import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineHash, defineSearch, mergeSearch } from '../url-state/define-url-descriptors';
import { defineRoute } from './define-route';

describe('defineRoute', () => {
  it('preserves declaration literals', () => {
    const route = defineRoute({
      id: 'blog.articles.show',
      parent: 'blog',
      path: 'articles/{slug}',
      search: { tab: { type: 'string', optional: true } },
      hash: { type: 'enum', values: ['comments', 'share'], optional: true },
      meta: { title: 'Article' },
    } as const);

    expect(route.id).toBe('blog.articles.show');
    expectTypeOf<typeof route.id>().toEqualTypeOf<'blog.articles.show'>();
    expectTypeOf<typeof route.parent>().toEqualTypeOf<'blog'>();
    expectTypeOf<(typeof route.hash.values)[number]>().toEqualTypeOf<'comments' | 'share'>();
  });
});

describe('defineSearch and defineHash', () => {
  it('preserves reusable descriptor literals', () => {
    const querySearch = defineSearch({ query: { type: 'string', optional: true } } as const);
    const paginationSearch = defineSearch({ page: { type: 'int', default: 1 } } as const);
    const articleSearch = mergeSearch(querySearch, paginationSearch, {
      sort: { type: 'enum', values: ['new', 'top'], optional: true },
    } as const);
    const hash = defineHash({
      type: 'enum',
      values: ['comments', 'share'],
      optional: true,
    } as const);

    expect(articleSearch.page.default).toBe(1);
    expect(hash.values).toEqual(['comments', 'share']);
    expectTypeOf<(typeof articleSearch.sort.values)[number]>().toEqualTypeOf<'new' | 'top'>();
    expectTypeOf<(typeof hash.values)[number]>().toEqualTypeOf<'comments' | 'share'>();
  });

  it('rejects duplicate mergeSearch keys at runtime', () => {
    expect(() =>
      mergeSearch(
        { query: { type: 'string', optional: true } },
        { query: { type: 'int', optional: true } },
      ),
    ).toThrow('Duplicate search descriptor key "query" passed to mergeSearch().');
  });
});
