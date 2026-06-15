import { describe, expect, it } from 'vitest';
import { extractRouteModuleLiterals } from './extract-define-routes-call';

describe('extractRouteModuleLiterals', () => {
  it('extracts routes and options from annotated defineRoutes calls', () => {
    expect(
      extractRouteModuleLiterals(
        'routes.ts',
        'export const routes: readonly unknown[] = defineRoutes([{ id: "home", path: "/" }] as const, { pathOptions: {} });',
      ),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
      exportName: 'routes',
      optionsLiteral: '{ pathOptions: {} }',
    });
  });

  it('extracts routes and options from defineRoutes calls', () => {
    expect(
      extractRouteModuleLiterals(
        'routes.ts',
        'export const routes = defineRoutes([{ id: "home", path: "/" }] as const, { pathOptions: {} });',
      ),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
      exportName: 'routes',
      optionsLiteral: '{ pathOptions: {} }',
    });
  });

  it('extracts annotated static exported route arrays', () => {
    expect(
      extractRouteModuleLiterals(
        'routes.ts',
        'export const routes: readonly unknown[] = [{ id: "home", path: "/" }];',
      ),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
      exportName: 'routes',
    });
  });

  it('extracts static exported route arrays', () => {
    expect(
      extractRouteModuleLiterals('routes.ts', 'export const routes = [{ id: "home", path: "/" }];'),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
      exportName: 'routes',
    });
  });

  it('extracts named-exported defineRoutes aliases using the exported name', () => {
    expect(
      extractRouteModuleLiterals(
        'routes.ts',
        'const appRoutes = defineRoutes([{ id: "home", path: "/" }] as const); export { appRoutes as routes };',
      ),
    ).toEqual({
      routesLiteral: '[{ id: "home", path: "/" }]',
      exportName: 'routes',
    });
  });

  it('ignores unexported defineRoutes calls', () => {
    expect(() =>
      extractRouteModuleLiterals(
        'routes.ts',
        'const appRoutes = defineRoutes([{ id: "home", path: "/" }] as const);',
      ),
    ).toThrow('must export routes');
  });
});
