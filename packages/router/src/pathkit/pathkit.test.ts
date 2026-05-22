import { describe, expect, test } from 'vitest';
import {
  compilePathPattern,
  getPathParams,
  prunePathname,
  matchPathPattern,
  validatePathPattern,
} from './pathkit';

const uuidPattern =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';

describe('pathkit integration adapter', () => {
  test('delegates validation to @cookbook/pathkit', () => {
    expect(() => validatePathPattern('/users/{id:int}')).not.toThrow();
    expect(() => validatePathPattern('/users/{id:number}')).toThrow(
      'Unknown constraint type: "number"',
    );
  });

  test('extracts path params from @cookbook/pathkit tokens', () => {
    expect(
      getPathParams(`/organizations/{organizationId:regex(${uuidPattern})}/users/{userId:int}`),
    ).toEqual([
      {
        name: 'organizationId',
        constraint: 'regex',
        token: `{organizationId:regex(${uuidPattern})}`,
      },
      {
        name: 'userId',
        constraint: 'int',
        token: '{userId:int}',
      },
    ]);
  });

  test('matches static, string, int, regex-constrained, and wildcard params through @cookbook/pathkit', () => {
    expect(matchPathPattern('/users/{id:int}', '/users/42')).toEqual({ id: '42' });
    expect(matchPathPattern('/files/{name}', '/files/readme.md')).toEqual({ name: 'readme.md' });
    expect(matchPathPattern('/posts/{slug:regex([a-z0-9-]+)}', '/posts/hello-world')).toEqual({
      slug: 'hello-world',
    });
    expect(matchPathPattern('/assets/{*path}', '/assets/images/logo.svg')).toEqual({
      path: 'images/logo.svg',
    });
    expect(
      matchPathPattern(
        `/orgs/{id:regex(${uuidPattern})}`,
        '/orgs/123e4567-e89b-12d3-a456-426614174000',
      ),
    ).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });
  });

  test('treats @cookbook/pathkit constraint failures as non-matches', () => {
    expect(matchPathPattern('/users/{id:int}', '/users/abc')).toBeNull();
    expect(matchPathPattern('/posts/{slug:regex([a-z0-9-]+)}', '/posts/no spaces')).toBeNull();
    expect(matchPathPattern('/users/{id:int}', '/teams/42')).toBeNull();
  });

  test('compiles href pathnames through @cookbook/pathkit', () => {
    expect(compilePathPattern('/users/{id:int}', { id: 42 })).toBe('/users/42');
    expect(compilePathPattern('/assets/{*path}', { path: ['images', 'logo.svg'] })).toBe(
      '/assets/images/logo.svg',
    );
    expect(compilePathPattern('/search/{term?}')).toBe('/search');
    expect(() =>
      compilePathPattern('/page/{type:list(home|dashboard)}', { type: 'settings' }),
    ).toThrow('must be one of');
  });

  test('uses prune all as the default path cleanup behavior', () => {
    expect(compilePathPattern('/hello//world/')).toBe('/hello/world');
    expect(prunePathname('/gallery/')).toBe('/gallery');
    expect(prunePathname('/gallery//photos/', { prune: 'duplication' })).toBe('/gallery/photos/');
    expect(prunePathname('/gallery//photos/', { prune: 'trailing' })).toBe('/gallery//photos');
    expect(prunePathname('/gallery//photos/', { prune: false })).toBe('/gallery//photos/');
  });

  test('supports pathkit-only route features that the router does not implement itself', () => {
    expect(matchPathPattern('/page/{section:list(home|dashboard)}', '/page/dashboard')).toEqual({
      section: 'dashboard',
    });
    expect(matchPathPattern('/page/{section:list(home|dashboard)}', '/page/settings')).toBeNull();
    expect(matchPathPattern('/search/{term?}', '/search')).toEqual({});
  });

  test('rejects malformed pathkit patterns with pathkit errors', () => {
    expect(() => validatePathPattern('/users/{id:int')).toThrow('Expected closing brace');
    expect(() => validatePathPattern('/users/{:int}')).toThrow('Missing parameter name');
    expect(() => validatePathPattern('/users/{id:number}')).toThrow(
      'Unknown constraint type: "number"',
    );
    expect(() => validatePathPattern('/users/{id:int}/posts/{id:int}')).toThrow(
      'Duplicate parameter',
    );
  });

  test('accepts the root route pattern', () => {
    expect(matchPathPattern('/', '/')).toEqual({});
    expect(getPathParams('/')).toEqual([]);
  });
});
