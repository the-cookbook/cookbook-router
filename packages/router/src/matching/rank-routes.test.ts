import { describe, expect, test } from 'vitest';
import { normalizeRoutes } from './normalize-routes';
import { flattenRoutes, rankRoutes } from './rank-routes';

describe('rankRoutes', () => {
  test('flattens normalized route trees', () => {
    const normalized = normalizeRoutes([
      {
        id: 'root',
        path: '/',
        children: [{ id: 'home', index: true }],
      },
    ]);

    expect(flattenRoutes(normalized).map((route) => route.id)).toEqual(['root', 'home']);
  });

  test('ranks static routes before dynamic routes and wildcard routes', () => {
    const normalized = normalizeRoutes([
      { id: 'files.catch', path: '/files/{*path}' },
      { id: 'files.show', path: '/files/{id:int}' },
      { id: 'files.new', path: '/files/new' },
    ]);

    expect(rankRoutes(normalized).map((route) => route.id)).toEqual([
      'files.new',
      'files.show',
      'files.catch',
    ]);
  });

  test('returns cached flattened and ranked arrays for repeated reads of the same normalized tree', () => {
    const normalized = normalizeRoutes([
      { id: 'home', path: '/' },
      { id: 'users.show', path: '/users/{id:int}' },
    ]);

    expect(flattenRoutes(normalized)).toBe(flattenRoutes(normalized));
    expect(rankRoutes(normalized)).toBe(rankRoutes(normalized));
  });

  test('uses declaration order as the final tie breaker', () => {
    const normalized = normalizeRoutes([
      { id: 'first', path: '/{first}' },
      { id: 'second', path: '/{second}' },
    ]);

    expect(rankRoutes(normalized).map((route) => route.id)).toEqual(['first', 'second']);
  });
});
