import { afterEach, describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import { normalizeRoutes } from '../route-config/normalize-routes';
import {
  createPathConstraint,
  registerPathConstraints,
  resetPathConstraints,
} from '../path/constraints';
import { defineRoutes } from '../route-config/define-routes';
import { matchLocation, matchLocationResult } from './match-location';

afterEach(() => {
  resetPathConstraints();
});

describe('matchLocation', () => {
  it('returns URLKit-parsed params, search, and hash state', () => {
    const routes = normalizeRoutes(
      defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          search: { tags: { type: 'string', many: true, optional: true } },
          hash: { type: 'enum', values: ['profile'], optional: true },
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
      defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          hash: { type: 'enum', values: ['profile'], optional: true },
        },
      ]),
    );

    expect(matchLocation({ routes, location: parseHref('/users/abc#profile') })).toBeNull();
  });

  it('recovers, rejects, or errors for invalid hash state according to policy', () => {
    const routes = normalizeRoutes(
      defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          hash: { type: 'enum', values: ['profile'], optional: true },
        },
      ]),
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

it('does not resolve slots for candidates rejected by search no-match policy', () => {
  let slotConstraintHits = 0;
  const slotProbe = createPathConstraint({
    parse() {
      slotConstraintHits += 1;
    },
    verify() {},
    toRegExp() {
      return '[0-9]+';
    },
  });

  registerPathConstraints({ slot_probe: slotProbe });

  const routes = normalizeRoutes(
    defineRoutes([
      {
        id: 'dashboard',
        path: '/dashboard/{id:int}',
        search: { tab: { type: 'enum', values: ['ok'] } },
        url: { invalidSearch: 'no-match' },
        layout: {
          view: () => null,
          slots: {
            inspector: {
              routes: [{ id: 'dashboard.inspector', path: 'inspector/{slotId:slot_probe}' }],
            },
          },
        },
      },
      { id: 'fallback', path: '/{*path}' },
    ]),
  );

  expect(matchLocation({ routes, location: parseHref('/dashboard/1?tab=bad') })?.id).toBe(
    'fallback',
  );
  expect(slotConstraintHits).toBe(0);
});
