import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createConstraint } from '../pathkit/pathkit';
import { defineRoutes } from './define-routes';

afterEach(() => {
  resetConstraints();
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
            hash: ['profile', 'settings'],
          },
        ],
      },
    ] as const);

    expect(routes[0]?.id).toBe('root');
    expectTypeOf<(typeof routes)[0]['id']>().toEqualTypeOf<'root'>();
    expectTypeOf<(typeof routes)[0]['children'][1]['id']>().toEqualTypeOf<'users.show'>();
    expectTypeOf<(typeof routes)[0]['children'][1]['hash'][number]>().toEqualTypeOf<
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
    const slug = createConstraint({
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

  it('applies path options during immediate validation', () => {
    const routes = defineRoutes([{ id: 'gallery', path: '/gallery/' }] as const, {
      pathOptions: { prune: false },
    });

    expect(routes[0]?.path).toBe('/gallery/');
  });
});
