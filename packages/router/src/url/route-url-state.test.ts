import { describe, expect, it } from 'vitest';
import type { NormalizedRoute } from '../routes/contracts';
import {
  buildRouteHash,
  buildRoutePath,
  buildRouteSearch,
  parseRouteHash,
  parseRoutePathParams,
  parseRouteSearch,
  parseRouteUrlState,
} from './route-url-state';

function normalizedRoute(route: NormalizedRoute['route']): NormalizedRoute {
  return {
    id: route.id,
    fullPath: route.path,
    localPath: route.path,
    children: [],
    params: [{ name: 'id', constraint: 'int', optional: false, repeat: false }],
    index: false,
    score: 0,
    order: 0,
    route,
    slotRoute: false,
    intercepts: [],
  } as unknown as NormalizedRoute;
}

describe('route URL state helpers', () => {
  it('parses and builds URLKit-backed route path, search, and hash state', () => {
    const route = normalizedRoute({
      id: 'users.show',
      path: '/users/{id:int}',
      search: {
        tags: { value: 'string', type: 'many', optional: true },
      },
      hash: ['details', 'activity'],
      url: { arrayFormat: 'comma' },
    });

    expect(parseRoutePathParams(route, '/users/42')).toEqual({ id: 42 });
    expect(buildRoutePath(route, { id: 42 })).toBe('/users/42');
    expect(parseRouteSearch(route, '?tags=router,typescript')).toEqual({
      tags: ['router', 'typescript'],
    });
    expect(buildRouteSearch(route, { tags: ['router', 'typescript'] })).toBe(
      '?tags=router%2Ctypescript',
    );
    expect(parseRouteHash(route, '#details')).toBe('details');
    expect(buildRouteHash(route, 'activity')).toBe('#activity');
    expect(parseRouteUrlState(route, '/users/42', '?tags=router,typescript', '#details')).toEqual({
      params: { id: 42 },
      search: { tags: ['router', 'typescript'] },
      hash: 'details',
    });
  });

  it('recovers invalid optional search params by default', () => {
    const route = normalizedRoute({
      id: 'overview',
      path: '/overview',
      search: {
        page: { value: 'number', optional: true },
        pageSize: { value: 'number', optional: true },
      },
    });

    expect(parseRouteSearch(route, '?page=a&pageSize=10')).toEqual({ pageSize: 10 });
  });

  it('uses descriptor defaults when recovering invalid defaulted search params', () => {
    const route = normalizedRoute({
      id: 'overview',
      path: '/overview',
      search: {
        page: { value: 'number', default: 1, optional: true },
        pageSize: { value: 'number', optional: true },
      },
    });

    expect(parseRouteSearch(route, '?page=a&pageSize=10')).toEqual({ page: 1, pageSize: 10 });
    expect(
      parseRouteSearch(route, '?page=a&pageSize=10', { callUrl: { invalidSearch: 'recover' } }),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('recovers invalid required search params as missing values', () => {
    const route = normalizedRoute({
      id: 'reports',
      path: '/reports',
      search: {
        page: { value: 'number' },
      },
    });

    expect(parseRouteSearch(route, '?page=a')).toEqual({});
  });

  it('keeps strict URLKit search validation when invalidSearch is error or no-match', () => {
    const route = normalizedRoute({
      id: 'overview',
      path: '/overview',
      search: {
        page: { value: 'number', optional: true },
      },
    });

    expect(() =>
      parseRouteSearch(route, '?page=a', { callUrl: { invalidSearch: 'error' } }),
    ).toThrow('Expected a finite number value');
    expect(() =>
      parseRouteSearch(route, '?page=a', { callUrl: { invalidSearch: 'no-match' } }),
    ).toThrow('Expected a finite number value');
  });

  it('recovers invalid hash values by default and can keep strict hash validation', () => {
    const route = normalizedRoute({
      id: 'products',
      path: '/products',
      hash: ['grid', 'list'],
    });

    expect(parseRouteHash(route, '#missing')).toBeUndefined();
    expect(() =>
      parseRouteHash(route, '#missing', { callUrl: { invalidHash: 'error' } }),
    ).toThrow();
    expect(() =>
      parseRouteHash(route, '#missing', { callUrl: { invalidHash: 'no-match' } }),
    ).toThrow();
  });

  it('lets per-call URL options override route-level array formatting', () => {
    const route = normalizedRoute({
      id: 'products',
      path: '/products',
      search: {
        tags: { value: 'string', type: 'many', optional: true },
      },
      url: { arrayFormat: 'comma' },
    });

    expect(
      buildRouteSearch(
        route,
        { tags: ['router', 'typescript'] },
        { callUrl: { arrayFormat: 'repeat' } },
      ),
    ).toBe('?tags=router&tags=typescript');
  });
});
