import { describe, expect, it } from 'vitest';
import { assertRouteFile, isRouteFile } from './route-file-assertions';

describe('route file assertions', () => {
  it('accepts objects with route arrays', () => {
    const value = { routes: [] };
    expect(isRouteFile(value)).toBe(true);
    expect(assertRouteFile('routes.ts', value)).toBe(value);
  });

  it('rejects non-route-file values', () => {
    expect(isRouteFile({ routes: {} })).toBe(false);
    expect(() => assertRouteFile('routes.ts', { routes: {} })).toThrow(
      'must provide a routes array',
    );
  });
});
