import { describe, expect, it } from 'vitest';
import {
  createRouteUrlStateOptions,
  matchRoutePathCandidates,
  matchRoutes,
  resolveRouteUrlContractStore,
} from './match-routes';
import { normalizeRoutes } from '../route-config/normalize-routes';

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

    expect(matchRoutes(routes, '/missing/page/')?.params).toEqual({ path: ['missing', 'page'] });
  });

  it('returns null for non-matches and URLKit constraint failures', () => {
    const routes = normalizeRoutes([{ id: 'users.show', path: '/users/{id:int}' }]);

    expect(matchRoutes(routes, '/teams/1')).toBeNull();
    expect(matchRoutes(routes, '/users/abc')).toBeNull();
  });
});

it('matches concrete descendants before root catch-all routes after modular composition order', () => {
  const routes = normalizeRoutes([
    { id: 'login', path: '/login' },
    { id: 'not-found', path: '/{*path}' },
    {
      id: 'entry',
      path: '/',
      children: [{ id: 'overview', path: 'overview' }],
    },
  ]);

  expect(matchRoutes(routes, '/overview')).toMatchObject({ id: 'overview' });
});

it('matches static, dynamic, then wildcard routes by specificity regardless of declaration order', () => {
  const routes = normalizeRoutes([
    { id: 'users.catch', path: '/users/{*path}' },
    { id: 'users.show', path: '/users/{id:int}' },
    { id: 'users.new', path: '/users/new' },
  ]);

  expect(matchRoutes(routes, '/users/new')?.id).toBe('users.new');
  expect(matchRoutes(routes, '/users/42')?.id).toBe('users.show');
  expect(matchRoutes(routes, '/users/unknown/path')?.id).toBe('users.catch');
});

describe('match route path candidates', () => {
  it('returns path-only candidates without resolving slots', () => {
    const routes = normalizeRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          slots: {
            modal: {
              routes: [{ id: 'dashboard.modal', path: 'modal/{id:int}' }],
            },
          },
        },
        children: [{ id: 'dashboard.show', path: 'show/{id:int}' }],
      },
    ]);

    const [candidate] = matchRoutePathCandidates(routes, '/dashboard/show/7');

    expect(candidate).toMatchObject({
      id: 'dashboard.show',
      pathname: '/dashboard/show/7',
      params: { id: 7 },
    });
    expect(candidate?.branch.map((entry) => entry.id)).toEqual(['dashboard', 'dashboard.show']);
    expect('slots' in (candidate ?? {})).toBe(false);
  });

  it('uses one reusable RouteUrlStateOptions object with all supported option families', () => {
    const contractStore = resolveRouteUrlContractStore({});
    const options = createRouteUrlStateOptions(
      {
        routerUrl: { pathMatch: { sensitive: true }, arrayFormat: 'comma' },
        callUrl: { pathMatch: { decode: true }, arrayFormat: 'repeat' },
        pathConstraints: {},
      },
      contractStore,
    );

    expect(options).toEqual({
      routerUrl: { pathMatch: { sensitive: true }, arrayFormat: 'comma' },
      callUrl: { pathMatch: { decode: true }, arrayFormat: 'repeat' },
      pathConstraints: {},
      contractStore,
    });
  });

  it('reuses a supplied contract store and preserves combined path match options', () => {
    const contractStore = resolveRouteUrlContractStore({});
    const routes = normalizeRoutes([{ id: 'files', path: '/Files/{*path}' }]);
    const [candidate] = matchRoutePathCandidates(
      routes,
      '/Files/a%2Fb/c',
      {
        routeUrlContracts: contractStore,
        callUrl: {
          pathMatch: {
            sensitive: true,
            decode: true,
            trailing: false,
            strict: false,
            wildcardFormat: 'array',
          },
        },
      },
      contractStore,
    );

    expect(resolveRouteUrlContractStore({ routeUrlContracts: contractStore })).toBe(contractStore);
    expect(candidate?.params).toEqual({ path: ['a/b', 'c'] });
  });
});
