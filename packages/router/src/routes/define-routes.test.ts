import { describe, expect, expectTypeOf, test } from 'vitest';
import { defineRoutes } from './define-routes';

describe('defineRoutes', () => {
  test('preserves route literals and readonly route trees', () => {
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

  test('runs development validation immediately', () => {
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
});
