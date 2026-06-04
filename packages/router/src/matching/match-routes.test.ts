import { describe, expect, it } from 'vitest';
import { matchRoutes } from './match-routes';
import { normalizeRoutes } from './normalize-routes';

describe('matchRoutes', () => {
  it('matches the highest-ranked route and returns decoded params', () => {
    const routes = normalizeRoutes([
      { id: 'users.dynamic', path: '/users/{id:int}' },
      { id: 'users.new', path: '/users/new' },
    ]);

    expect(matchRoutes(routes, '/users/new')?.id).toBe('users.new');
    expect(matchRoutes(routes, '/users/42')).toMatchObject({
      id: 'users.dynamic',
      pathname: '/users/42',
      route: { id: 'users.dynamic' },
      params: { id: 42 },
    });
  });

  it('returns the matched branch with inherited params', () => {
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

    const match = matchRoutes(
      routes,
      '/organizations/123e4567-e89b-12d3-a456-426614174000/users/7',
    );

    expect(match?.branch.map((entry) => entry.id)).toEqual([
      'organizations',
      'organizations.users.show',
    ]);
    expect(match?.params).toEqual({
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      userId: 7,
    });
  });

  it('matches nested children declared with leading slashes under their parent path', () => {
    const routes = normalizeRoutes([
      {
        id: 'policies',
        path: '/policies',
        children: [
          {
            id: 'terms-of-service',
            path: '/terms-of-service',
          },
        ],
      },
    ]);

    expect(matchRoutes(routes, '/policies/terms-of-service')).toMatchObject({
      id: 'terms-of-service',
      pathname: '/policies/terms-of-service',
    });
    expect(matchRoutes(routes, '/terms-of-service')).toBeNull();
  });

  it('supports wildcard and trailing-slash matches', () => {
    const routes = normalizeRoutes([{ id: 'not-found', path: '/{*path}' }]);

    expect(matchRoutes(routes, '/missing/page/')?.params).toEqual({ path: 'missing/page/' });
  });

  it('returns null for non-matches and pathkit constraint failures', () => {
    const routes = normalizeRoutes([{ id: 'users.show', path: '/users/{id:int}' }]);

    expect(matchRoutes(routes, '/teams/1')).toBeNull();
    expect(matchRoutes(routes, '/users/abc')).toBeNull();
  });
});
