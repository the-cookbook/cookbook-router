import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createPathConstraint, resetPathConstraints } from '../path/constraints';
import { defineRoutes, getDefineRoutesOptions } from './define-routes';

afterEach(() => {
  resetPathConstraints();
});

describe('defineRoutes', () => {
  it('preserves route literals and readonly route trees', () => {
    const routes = defineRoutes([
      {
        id: 'root',
        path: '/',
        children: [
          {
            id: 'home',
            index: true,
          },
          {
            id: 'users.show',
            path: 'users/{id:int}',
            hash: { type: 'enum', values: ['profile', 'settings'], optional: true },
          },
        ],
      },
    ] as const);

    expect(routes[0]?.id).toBe('root');
    expectTypeOf<(typeof routes)[0]['id']>().toEqualTypeOf<'root'>();
    expectTypeOf<(typeof routes)[0]['children'][1]['id']>().toEqualTypeOf<'users.show'>();
    expectTypeOf<(typeof routes)[0]['children'][1]['hash']['values'][number]>().toEqualTypeOf<
      'profile' | 'settings'
    >();
  });

  it('runs development validation immediately', () => {
    expect(() =>
      defineRoutes([
        {
          id: 'users',
          index: true,
          path: '/users',
        },
      ] as const),
    ).toThrow('must not define path');
  });

  it('registers custom path constraints before immediate validation', () => {
    const slug = createPathConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });

    const routes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const, {
      pathConstraints: { slug },
    });

    expect(routes[0]?.path).toBe('/posts/{slug:slug}');
  });

  it('stores route options on the returned array using a shared non-enumerable symbol', () => {
    const slug = createPathConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    });
    const routes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const, {
      pathConstraints: { slug },
    });
    const sharedOptions = (routes as unknown as Record<symbol, unknown>)[
      Symbol.for('cookbook.router.defineRoutesOptions')
    ];

    expect(sharedOptions).toEqual({ pathConstraints: { slug } });
    expect(getDefineRoutesOptions(routes)).toEqual({ pathConstraints: { slug } });
    expect(Object.keys(routes)).toEqual(['0']);
  });

  it('applies path options during immediate validation', () => {
    const routes = defineRoutes([{ id: 'gallery', path: '/gallery/' }] as const, {
      pathOptions: { prune: false },
    });

    expect(routes[0]?.path).toBe('/gallery/');
  });
});
