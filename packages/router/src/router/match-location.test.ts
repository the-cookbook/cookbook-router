import { describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import { normalizeRoutes } from '../matching/normalize-routes';
import { defineRoutes } from '../routes/define-routes';
import { matchLocation, matchLocationResult } from './match-location';

describe('matchLocation', () => {
  it('returns URLKit-parsed params, search, and hash state', () => {
    const routes = normalizeRoutes(
      defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          search: { tags: { type: 'many', optional: true } },
          hash: ['profile'],
        },
      ]),
    );

    const match = matchLocation({
      routes,
      location: parseHref('/users/42?tags=a,b#profile'),
      routerUrl: { arrayFormat: 'comma' },
    });

    expect(match?.params).toEqual({ id: 42 });
    expect(match?.search).toEqual({ tags: ['a', 'b'] });
    expect(match?.hash).toBe('profile');
  });

  it('returns null when route path state fails validation', () => {
    const routes = normalizeRoutes(
      defineRoutes([{ id: 'user', path: '/users/{id:int}', hash: ['profile'] }]),
    );

    expect(matchLocation({ routes, location: parseHref('/users/abc#profile') })).toBeNull();
  });

  it('recovers, rejects, or errors for invalid hash state according to policy', () => {
    const routes = normalizeRoutes(
      defineRoutes([{ id: 'user', path: '/users/{id:int}', hash: ['profile'] }]),
    );

    expect(matchLocation({ routes, location: parseHref('/users/42#settings') })?.hash).toBe(
      undefined,
    );
    expect(
      matchLocation({
        routes,
        location: parseHref('/users/42#settings'),
        routerUrl: { invalidHash: 'no-match' },
      }),
    ).toBeNull();
    expect(
      matchLocationResult({
        routes,
        location: parseHref('/users/42#settings'),
        routerUrl: { invalidHash: 'error' },
      }).status,
    ).toBe('error');
  });
});
