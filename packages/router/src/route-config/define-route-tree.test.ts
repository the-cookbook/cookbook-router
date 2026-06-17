import { afterEach, describe, expect, it } from 'vitest';
import { createPathConstraint, resetPathConstraints } from '../path/constraints';
import { defineRoute } from './define-route';
import { defineRouteTree } from './define-route-tree';
import { getDefineRoutesOptions } from './define-routes';

afterEach(() => {
  resetPathConstraints();
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
