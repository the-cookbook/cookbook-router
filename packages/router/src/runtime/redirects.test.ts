import { describe, expect, it } from 'vitest';
import {
  isExternalHref,
  normalizeMaxRedirectDepth,
  resolveMatchedRouteRedirect,
} from './redirects';

describe('redirect helpers', () => {
  it('normalizes redirect depth and rejects invalid values', () => {
    expect(normalizeMaxRedirectDepth({ routes: [] })).toBe(10);
    expect(normalizeMaxRedirectDepth({ routes: [], maxRedirectDepth: 0 })).toBe(0);
    expect(() => normalizeMaxRedirectDepth({ routes: [], maxRedirectDepth: -1 })).toThrow(
      'non-negative integer',
    );
  });

  it('detects external hrefs', () => {
    expect(isExternalHref('https://example.com')).toBe(true);
    expect(isExternalHref('//example.com')).toBe(true);
    expect(isExternalHref('/internal')).toBe(false);
  });

  it('returns undefined when there is no matched route', () => {
    expect(resolveMatchedRouteRedirect(null)).toBeUndefined();
  });
});
