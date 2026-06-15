import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createPathConstraint } from '../path';
import { defineHash, defineSearch, mergeSearch } from '../url-state/define-url-descriptors';
import { defineRoute, defineRouteTree } from './define-route';
import { getDefineRoutesOptions } from './define-routes';

afterEach(() => {
  resetConstraints();
});

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

describe('defineRouteTree', () => {
  it('composes explicit parent declarations and strips composition fields', () => {
    const blogRoute = defineRoute({ id: 'blog', path: '/blog', order: 20 } as const);
    const articleRoute = defineRoute({
      id: 'blog.articles.show',
      parent: 'blog',
      path: 'articles/{slug}',
      order: 10,
    } as const);

    const routes = defineRouteTree({ routes: [blogRoute, articleRoute] } as const);

    expect(routes).toEqual([
      {
        id: 'blog',
        path: '/blog',
        children: [{ id: 'blog.articles.show', path: 'articles/{slug}' }],
      },
    ]);
    expect('parent' in routes[0]!).toBe(false);
    expect('order' in routes[0]!).toBe(false);
  });

  it('merges parent-attached children with inline children in deterministic order', () => {
    const routes = defineRouteTree({
      routes: [
        defineRoute({
          id: 'dashboard',
          path: '/dashboard',
          children: [
            defineRoute({ id: 'dashboard.index', index: true } as const),
            defineRoute({ id: 'dashboard.settings', path: 'settings', order: 20 } as const),
          ],
        } as const),
        defineRoute({
          id: 'dashboard.users',
          parent: 'dashboard',
          path: 'users',
          order: 10,
        } as const),
      ],
    } as const);

    expect(routes[0]?.children?.map((route) => route.id)).toEqual([
      'dashboard.users',
      'dashboard.settings',
      'dashboard.index',
    ]);
  });

  it('rejects missing parents', () => {
    expect(() =>
      defineRouteTree({
        routes: [defineRoute({ id: 'blog.articles.show', parent: 'blog', path: 'articles' })],
      }),
    ).toThrow('declares parent "blog"');
  });

  it('rejects parent cycles', () => {
    expect(() =>
      defineRouteTree({
        routes: [
          defineRoute({ id: 'a', parent: 'b', path: 'a' }),
          defineRoute({ id: 'b', parent: 'a', path: 'b' }),
        ],
      }),
    ).toThrow('Route parent cycle found: a -> b -> a.');
  });

  it('rejects absolute child paths', () => {
    expect(() =>
      defineRouteTree({
        routes: [
          defineRoute({ id: 'blog', path: '/blog' }),
          defineRoute({ id: 'blog.articles', parent: 'blog', path: '/articles' }),
        ],
      }),
    ).toThrow('Child route paths must be relative');
  });

  it('rejects duplicate index children under one parent', () => {
    expect(() =>
      defineRouteTree({
        routes: [
          defineRoute({ id: 'blog', path: '/blog' }),
          defineRoute({ id: 'blog.index', parent: 'blog', index: true }),
          defineRoute({ id: 'blog.home', parent: 'blog', index: true }),
        ],
      }),
    ).toThrow('duplicate index routes');
  });

  it('rejects redirect route parents', () => {
    expect(() =>
      defineRouteTree({
        routes: [
          defineRoute({ id: 'root', path: '/', redirect: '/blog' }),
          defineRoute({ id: 'root.child', parent: 'root', path: 'child' }),
        ],
      }),
    ).toThrow('redirect routes cannot have children');
  });

  it('rejects missing intercept targets and slots', () => {
    expect(() =>
      defineRouteTree({
        routes: [
          defineRoute({
            id: 'blog',
            path: '/blog',
            layout: { view: () => null, slots: { modal: true } },
            intercepts: { modal: { to: 'missing', view: () => null } },
          }),
        ],
      }),
    ).toThrow('targets missing route "missing"');

    expect(() =>
      defineRouteTree({
        routes: [
          defineRoute({ id: 'target', path: '/target' }),
          defineRoute({
            id: 'blog',
            path: '/blog',
            layout: { view: () => null },
            intercepts: { modal: { to: 'target', view: () => null } },
          }),
        ],
      }),
    ).toThrow('slot that is not declared');
  });

  it('preserves route tree options for router creation', () => {
    const slug = createPathConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    });

    const routes = defineRouteTree({
      routes: [defineRoute({ id: 'post.show', path: '/posts/{slug:preserved_slug}' })],
      pathOptions: { prune: 'all' },
      pathConstraints: { preserved_slug: slug },
    });

    expect(getDefineRoutesOptions(routes)).toEqual({
      pathOptions: { prune: 'all' },
      pathConstraints: { preserved_slug: slug },
    });
    expect(
      (routes as unknown as Record<symbol, unknown>)[
        Symbol.for('cookbook.router.defineRoutesOptions')
      ],
    ).toEqual({
      pathOptions: { prune: 'all' },
      pathConstraints: { preserved_slug: slug },
    });
  });

  it('registers custom path constraints before final validation', () => {
    const slug = createPathConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    });

    const routes = defineRouteTree({
      routes: [defineRoute({ id: 'post.show', path: '/posts/{slug:slug}' })],
      pathConstraints: { slug },
    });

    expect(routes[0]?.path).toBe('/posts/{slug:slug}');
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
