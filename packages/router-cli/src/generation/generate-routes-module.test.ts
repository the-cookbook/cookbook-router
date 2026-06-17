import { describe, expect, it } from 'vitest';
import { generateRoutesModule } from './generate-routes-module';

describe('generateRoutesModule', () => {
  it('re-exports a single static route tree to preserve defineRoutes options metadata', () => {
    expect(
      generateRoutesModule(
        [
          {
            path: 'src/routes.ts',
            routes: [{ id: 'home', path: '/' }],
            routeExports: [{ exportName: 'routes', kind: 'routes' }],
          },
        ],
        '.cookbook-router/routes.ts',
      ),
    ).toContain("import { routes as routes } from '../src/routes';\n\nexport { routes };");
  });

  it('re-exports a single aliased static route tree using the actual export name', () => {
    expect(
      generateRoutesModule(
        [
          {
            path: 'src/routes.ts',
            routes: [{ id: 'home', path: '/' }],
            routeExports: [{ exportName: 'appRoutes', kind: 'routes' }],
          },
        ],
        '.cookbook-router/routes.ts',
      ),
    ).toContain("import { appRoutes as routes } from '../src/routes';\n\nexport { routes };");
  });

  it('wraps multiple static route trees with defineRoutes', () => {
    expect(
      generateRoutesModule(
        [
          {
            path: 'src/a.routes.ts',
            routes: [{ id: 'a', path: '/a' }],
            routeExports: [{ exportName: 'routes', kind: 'routes' }],
          },
          {
            path: 'src/b.routes.ts',
            routes: [{ id: 'b', path: '/b' }],
            routeExports: [{ exportName: 'routes', kind: 'routes' }],
          },
        ],
        '.cookbook-router/routes.ts',
      ),
    ).toContain("import { defineRoutes } from '@cookbook/router/route-config';");
  });

  it('treats defineRouteTree exports as route arrays in generated modules', () => {
    expect(
      generateRoutesModule(
        [
          {
            path: 'src/a.routes.ts',
            routes: [{ id: 'a', path: '/a' }],
            routeExports: [{ exportName: 'routes', kind: 'routeTree' }],
          },
          {
            path: 'src/b.routes.ts',
            routes: [{ id: 'b', path: '/b' }],
            routeExports: [{ exportName: 'routes', kind: 'routes' }],
          },
        ],
        '.cookbook-router/routes.ts',
      ),
    ).toContain(
      "  ...__cookbookWithModulePreloads(routes0, () => import('../src/a.routes').then(() => undefined)),",
    );
  });

  it('rejects rewrapped source-level pathConstraints that cannot be preserved safely', () => {
    expect(() =>
      generateRoutesModule(
        [
          {
            path: 'src/a.routes.ts',
            routes: [{ id: 'a', path: '/a/{id:custom}' }],
            routeOptions: { pathConstraints: { custom: {} as never } },
            routeExports: [{ exportName: 'routes', kind: 'routes' }],
          },
          {
            path: 'src/b.routes.ts',
            routes: [{ id: 'b', path: '/b' }],
            routeExports: [{ exportName: 'routes', kind: 'routes' }],
          },
        ],
        '.cookbook-router/routes.ts',
      ),
    ).toThrow('cannot safely preserve pathConstraints');
  });

  it('attaches module preload helpers to generated defineRouteTree route declarations', () => {
    const output = generateRoutesModule(
      [
        {
          path: 'src/routes/users.route.tsx',
          routes: [{ id: 'users', path: '/users' }],
          routeExports: [{ exportName: 'route', kind: 'route' }],
        },
      ],
      'src/.cookbook-router/routes.ts',
    );

    expect(output).toContain("import { defineRouteTree } from '@cookbook/router/route-config';");
    expect(output).toContain(
      "import type { RouteDefinition, RouteModulePreload } from '@cookbook/router/route-config';",
    );
    expect(output).toContain(
      "__cookbookWithModulePreload(route0, () => import('../routes/users.route').then(() => undefined))",
    );
  });

  it('attaches module preload helpers to wrapped static route arrays', () => {
    const output = generateRoutesModule(
      [
        {
          path: 'src/a.routes.ts',
          routes: [{ id: 'a', path: '/a' }],
          routeExports: [{ exportName: 'routes', kind: 'routes' }],
        },
        {
          path: 'src/b.routes.ts',
          routes: [{ id: 'b', path: '/b' }],
          routeExports: [{ exportName: 'routes', kind: 'routes' }],
        },
      ],
      'src/.cookbook-router/routes.ts',
    );

    expect(output).toContain("import { defineRoutes } from '@cookbook/router/route-config';");
    expect(output).toContain(
      "import type { RouteDefinition, RouteModulePreload } from '@cookbook/router/route-config';",
    );
    expect(output).toContain(
      "...__cookbookWithModulePreloads(routes0, () => import('../a.routes').then(() => undefined))",
    );
    expect(output).toContain(
      "...__cookbookWithModulePreloads(routes1, () => import('../b.routes').then(() => undefined))",
    );
  });
});
