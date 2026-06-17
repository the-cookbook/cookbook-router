import { describe, expect, it } from 'vitest';
import { normalizeRoutes } from '../route-config/normalize-routes';
import * as matching from './index';

describe('matching public module', () => {
  it('re-exports route matching and ranking helpers', () => {
    expect(matching).toMatchObject({
      flattenRoutes: expect.any(Function),
      matchRoutes: expect.any(Function),
      rankRoutes: expect.any(Function),
    });
  });

  it('matches static and dynamic route variants through the subpath entry', () => {
    const routes = normalizeRoutes([
      { id: 'users', path: '/users' },
      { id: 'user', path: '/users/{id:int}' },
    ]);

    expect(matching.matchRoutes(routes, '/users/42')?.route.id).toBe('user');
    expect(matching.matchRoutes(routes, '/missing')).toBeNull();
  });
});
