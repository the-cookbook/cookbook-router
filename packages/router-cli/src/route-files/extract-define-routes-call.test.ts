import { describe, expect, it } from 'vitest';
import { extractRouteModuleLiterals } from './extract-define-routes-call';

describe('extractRouteModuleLiterals', () => {
  it('extracts routes and options from defineRoutes calls', () => {
    expect(
      extractRouteModuleLiterals(
        'routes.ts',
        'export const routes = defineRoutes([{ id: "home", path: "/" }] as const, { pathOptions: {} });',
      ),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
      optionsLiteral: '{ pathOptions: {} }',
    });
  });

  it('extracts static exported route arrays', () => {
    expect(
      extractRouteModuleLiterals('routes.ts', 'export const routes = [{ id: "home", path: "/" }];'),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
    });
  });
});
