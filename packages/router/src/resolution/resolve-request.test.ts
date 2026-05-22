import { describe, expect, test } from 'vitest';
import { normalizeRoutes } from '../matching/normalize-routes';
import { resolveRequest } from './resolve-request';

describe('resolveRequest', () => {
  test('parses request URLs and resolves route matches', () => {
    const routes = normalizeRoutes([{ id: 'users.show', path: '/users/{id:int}' }]);
    const result = resolveRequest({ routes, url: 'https://example.test/users/42?tab=settings' });

    expect(result.url.search).toBe('?tab=settings');
    expect(result.match?.route.id).toBe('users.show');
    expect(result.match?.params).toEqual({ id: '42' });
  });

  test('rejects unsafe request protocols', () => {
    const routes = normalizeRoutes([{ id: 'home', path: '/' }]);

    expect(() => resolveRequest({ routes, url: 'javascript:alert(1)' })).toThrow(
      'Static router URL must use http, https',
    );
  });

  test('returns null match for unmatched requests', () => {
    const routes = normalizeRoutes([{ id: 'home', path: '/' }]);

    expect(resolveRequest({ routes, url: '/missing' }).match).toBeNull();
  });
});
