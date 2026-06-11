import { describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import { matchLocationResult } from '../matching/match-location';
import { normalizeRoutes } from '../route-config/normalize-routes';
import { defineRoutes } from '../route-config/define-routes';
import { normalizePathOptions } from '../path';
import { canonicalizeLocation } from './canonical-location';

const routes = normalizeRoutes(
  defineRoutes([
    { id: 'home', path: '/' },
    { id: 'about', path: '/about' },
  ] as const),
);
const pathOptions = normalizePathOptions();

describe('canonicalizeLocation', () => {
  it('canonicalizes pruned pathnames that match a route', () => {
    const result = canonicalizeLocation({
      location: parseHref('/about/'),
      historyMode: 'memory',
      pathOptions,
      matchHrefResult: (href) =>
        matchLocationResult({ routes, location: parseHref(href), pathOptions }),
    });

    expect(result.location.href).toBe('/about');
    expect(result.match?.id).toBe('about');
    expect(result.replaced).toBe(true);
  });

  it('leaves unmatched locations untouched', () => {
    const result = canonicalizeLocation({
      location: parseHref('/missing'),
      historyMode: 'memory',
      pathOptions,
      matchHrefResult: (href) =>
        matchLocationResult({ routes, location: parseHref(href), pathOptions }),
    });

    expect(result.location.href).toBe('/missing');
    expect(result.match).toBeNull();
    expect(result.replaced).toBe(false);
  });
});
