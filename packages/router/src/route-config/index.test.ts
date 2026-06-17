import { describe, expect, it } from 'vitest';
import * as routeConfig from './index';

describe('route-config public module', () => {
  it('re-exports declaration, normalization, and validation helpers', () => {
    expect(routeConfig).toMatchObject({
      defineRoute: expect.any(Function),
      defineRouteTree: expect.any(Function),
      defineRoutes: expect.any(Function),
      normalizeRoutes: expect.any(Function),
      validateResolvedRouteTree: expect.any(Function),
      validateRoutes: expect.any(Function),
    });
  });

  it('keeps defineRoute as a zero-runtime declaration helper', () => {
    const route = { id: 'home', path: '/' } as const;

    expect(routeConfig.defineRoute(route)).toBe(route);
  });
});
