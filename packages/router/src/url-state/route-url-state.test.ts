import { describe, expect, it } from 'vitest';
import type { NormalizedRoute } from '../route-config/contracts';
import {
  buildRouteHash,
  buildRoutePath,
  buildRouteSearch,
  parseRouteHash,
  parseRoutePathParams,
  parseRouteSearch,
  parseRouteSearchState,
  parseRouteUrlState,
} from './route-url-state';

function normalizedRoute(route: NormalizedRoute['route']): NormalizedRoute {
  return {
    id: route.id,
    fullPath: route.path,
    localPath: route.path,
    children: [],
    params: [
      {
        name: 'id',
        constraints: [{ type: 'int', params: '' }],
        wildcard: false,
        optional: false,
        token: '{id:int}',
      },
    ],
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
        tags: { type: 'string', many: true, optional: true },
      },
      hash: { type: 'enum', values: ['details', 'activity'], optional: true },
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
        page: { type: 'number', optional: true },
        pageSize: { type: 'number', optional: true },
      },
    });

    expect(parseRouteSearch(route, '?page=a&pageSize=10')).toEqual({ pageSize: 10 });
  });

  it('uses descriptor defaults when recovering invalid defaulted search params', () => {
    const route = normalizedRoute({
      id: 'overview',
      path: '/overview',
      search: {
        page: { type: 'number', default: 1 },
        pageSize: { type: 'number', optional: true },
      },
    });

    expect(parseRouteSearch(route, '?page=a&pageSize=10')).toEqual({ page: 1, pageSize: 10 });
    expect(
      parseRouteSearch(route, '?page=a&pageSize=10', { callUrl: { invalidSearch: 'recover' } }),
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('propagates invalid required search params instead of recovering them', () => {
    const route = normalizedRoute({
      id: 'reports',
      path: '/reports',
      search: {
        page: { type: 'number' },
      },
    });

    expect(() => parseRouteSearch(route, '?page=a')).toThrow('Expected a finite number value');
  });

  it('keeps strict URLKit search validation when invalidSearch is error or no-match', () => {
    const route = normalizedRoute({
      id: 'overview',
      path: '/overview',
      search: {
        page: { type: 'number', optional: true },
      },
    });

    expect(() =>
      parseRouteSearch(route, '?page=a', { callUrl: { invalidSearch: 'error' } }),
    ).toThrow('Expected a finite number value');
    expect(() =>
      parseRouteSearch(route, '?page=a', { callUrl: { invalidSearch: 'no-match' } }),
    ).toThrow('Expected a finite number value');
  });

  it('forwards unknownSearch to URLKit search parsing', () => {
    const route = normalizedRoute({
      id: 'products',
      path: '/products',
      search: {
        page: { type: 'number', optional: true },
      },
    });

    expect(parseRouteSearch(route, '?page=1&debug=true')).toEqual({ page: 1 });
    expect(
      parseRouteSearch(route, '?page=1&debug=true', { callUrl: { unknownSearch: 'preserve' } }),
    ).toEqual({ page: 1 });
    expect(
      parseRouteSearchState(route, '/products', '?page=1&debug=true', {
        callUrl: { unknownSearch: 'preserve' },
      }),
    ).toEqual({ search: { page: 1 }, unknownSearch: { debug: 'true' } });
    expect(
      parseRouteUrlState(route, '/products', '?page=1&debug=true', '', {
        callUrl: { unknownSearch: 'preserve' },
      }),
    ).toEqual({
      params: {},
      search: { page: 1 },
      unknownSearch: { debug: 'true' },
      hash: undefined,
    });
    expect(() =>
      parseRouteSearch(route, '?page=1&debug=true', { callUrl: { unknownSearch: 'error' } }),
    ).toThrow('Unknown search parameter is not allowed');
  });

  it('recovers invalid hash values by default and can keep strict hash validation', () => {
    const route = normalizedRoute({
      id: 'products',
      path: '/products',
      hash: { type: 'enum', values: ['grid', 'list'], optional: true },
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
        tags: { type: 'string', many: true, optional: true },
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

it('parses wildcard route params as stable arrays and builds from strings or arrays', () => {
  const route = {
    ...normalizedRoute({ id: 'files', path: '/files/{*path}' }),
    params: [
      {
        name: 'path',
        constraints: [],
        wildcard: true,
        optional: false,
        token: '{*path}',
      },
    ],
  } as NormalizedRoute;

  expect(parseRoutePathParams(route, '/files/docs/readme')).toEqual({ path: ['docs', 'readme'] });
  expect(
    parseRoutePathParams(route, '/files/a%2Fb/c%20d', { callUrl: { pathMatch: { decode: true } } }),
  ).toEqual({ path: ['a/b', 'c d'] });
  expect(buildRoutePath(route, { path: ['docs', 'readme'] })).toBe('/files/docs/readme');
  expect(buildRoutePath(route, { path: 'docs/readme' })).toBe('/files/docs/readme');
});
