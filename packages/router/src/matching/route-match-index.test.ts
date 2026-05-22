import { describe, expect, test } from 'vitest';
import { normalizeRoutes } from './normalize-routes';
import { createMatchedBranch, getRouteMatchIndex } from './route-match-index';

const routes = normalizeRoutes([
  {
    id: 'organizations',
    path: '/organizations/{organizationId:regex([0-9a-fA-F-]+)}',
    children: [
      {
        id: 'organizations.users.show',
        path: 'users/{userId:int}',
      },
    ],
  },
]);

describe('route match index', () => {
  test('caches the route index for repeated matching against the same normalized tree', () => {
    const first = getRouteMatchIndex(routes);
    const second = getRouteMatchIndex(routes);

    expect(second).toBe(first);
    expect(first.rankedRoutes.map((route) => route.id)).toEqual([
      'organizations.users.show',
      'organizations',
    ]);
    expect(first.routesById.get('organizations.users.show')?.parentId).toBe('organizations');
  });

  test('creates matched branches without rebuilding parent lookup maps', () => {
    const index = getRouteMatchIndex(routes);
    const route = index.routesById.get('organizations.users.show');

    if (!route) {
      throw new Error('Expected users route to exist.');
    }

    const branch = createMatchedBranch(route, index, {
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '7',
    });

    expect(branch.map((match) => match.id)).toEqual(['organizations', 'organizations.users.show']);
    expect(branch[0]?.params).toEqual({ organizationId: '123e4567-e89b-12d3-a456-426614174000' });
    expect(branch[1]?.params).toEqual({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '7',
    });
  });
});
