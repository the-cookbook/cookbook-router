import { describe, expect, it } from 'vitest';
import { extractDefineRouteTreeLiteral } from './extract-define-route-tree-call';

describe('extractDefineRouteTreeLiteral', () => {
  it('extracts exported defineRouteTree object and inline routes array', () => {
    expect(
      extractDefineRouteTreeLiteral(
        'routes.ts',
        `export const routes = defineRouteTree({
  routes: [{ id: 'root', path: '/', children: [{ id: 'home', index: true }] }],
  pathOptions: { prune: 'all' },
} as const);`,
      ),
    ).toEqual({
      exportName: 'routes',
      localName: 'routes',
      treeLiteral:
        "{\n  routes: [{ id: 'root', path: '/', children: [{ id: 'home', index: true }] }],\n  pathOptions: { prune: 'all' },\n}",
      routesLiteral: "[{ id: 'root', path: '/', children: [{ id: 'home', index: true }] }]",
    });
  });

  it('supports named-exported defineRouteTree aliases', () => {
    expect(
      extractDefineRouteTreeLiteral(
        'routes.ts',
        `const appRoutes = defineRouteTree({ routes: [{ id: 'home', path: '/' }] } as const);
export { appRoutes as routes };`,
      ),
    ).toMatchObject({ exportName: 'routes', localName: 'appRoutes' });
  });

  it('rejects dynamic defineRouteTree arguments and non-inline routes values', () => {
    expect(() =>
      extractDefineRouteTreeLiteral(
        'routes.ts',
        'export const routes = defineRouteTree(routesConfig);',
      ),
    ).toThrow('must receive a static object literal');

    expect(() =>
      extractDefineRouteTreeLiteral(
        'routes.ts',
        'export const routes = defineRouteTree({ routes: routeList } as const);',
      ),
    ).toThrow('routes must be an inline static array');
  });

  it('rejects defineRouteTree objects without routes', () => {
    expect(() =>
      extractDefineRouteTreeLiteral(
        'routes.ts',
        "export const routes = defineRouteTree({ pathOptions: { prune: 'all' } } as const);",
      ),
    ).toThrow('must define a routes array');
  });
});
