import { describe, expect, it } from 'vitest';
import type { NormalizedRoute } from '../route-config/contracts';
import { normalizeNavigateTarget, resolveNavigationTarget } from './navigation-target';

const routes = new Map<string, NormalizedRoute>([
  ['users.show', { id: 'users.show' } as NormalizedRoute],
]);

describe('normalizeNavigateTarget', () => {
  it('normalizes positional route arguments', () => {
    expect(normalizeNavigateTarget('users.show', { params: { id: 1 } })).toEqual({
      route: 'users.show',
      options: { params: { id: 1 } },
    });
  });

  it('normalizes object route arguments', () => {
    expect(
      normalizeNavigateTarget({ route: 'users.show', params: { id: 1 }, hash: 'profile' }),
    ).toEqual({ route: 'users.show', options: { params: { id: 1 }, hash: 'profile' } });
  });
});

describe('resolveNavigationTarget', () => {
  it('resolves registered route ids before treating strings as hrefs', () => {
    expect(
      resolveNavigationTarget(
        'users.show',
        { params: { id: 1 } },
        {
          createRouteHref: (routeId, options) => `/${routeId}/${String(options?.params?.id)}`,
          matchHref: () => false,
          routes,
        },
      ),
    ).toEqual({ href: '/users.show/1' });
  });

  it('resolves matched internal hrefs without generating route hrefs', () => {
    expect(
      resolveNavigationTarget('/users/1?tab=settings#profile', undefined, {
        createRouteHref: () => {
          throw new Error('Should not generate route hrefs for internal hrefs.');
        },
        matchHref: (href) => href === '/users/1?tab=settings#profile',
        routes,
      }),
    ).toEqual({ href: '/users/1?tab=settings#profile' });
  });

  it('rejects unmatched and unsafe href-shaped targets', () => {
    expect(() =>
      resolveNavigationTarget('/missing', undefined, {
        createRouteHref: () => '/missing',
        matchHref: () => false,
        routes,
      }),
    ).toThrow('not registered');
    expect(() =>
      resolveNavigationTarget('//evil.example', undefined, {
        createRouteHref: () => '//evil.example',
        matchHref: () => true,
        routes,
      }),
    ).toThrow('not registered');
  });

  it('rejects route URL options when navigating to an internal href', () => {
    expect(() =>
      resolveNavigationTarget(
        '/users/1',
        { search: { tab: 'settings' } },
        {
          createRouteHref: () => '/users/1',
          matchHref: () => true,
          routes,
        },
      ),
    ).toThrow('Cannot navigate to internal href "/users/1" with route option "search".');
  });
});
