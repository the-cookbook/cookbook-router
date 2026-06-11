import { describe, expect, it } from 'vitest';
import { parseStaticRouteModule } from './parse-static-route-module';

describe('parseStaticRouteModule', () => {
  it('parses static defineRoutes modules', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        'export const routes = defineRoutes([{ id: "home", path: "/", view: HomePage }] as const);',
      ).routes,
    ).toEqual([{ id: 'home', path: '/', view: expect.any(Function) }]);
  });

  it('carries static defineRoutes options', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        'export const routes = defineRoutes([], { pathOptions: { trailingSlash: "ignore" } });',
      ).routeOptions,
    ).toEqual({ pathOptions: { trailingSlash: 'ignore' } });
  });
});
