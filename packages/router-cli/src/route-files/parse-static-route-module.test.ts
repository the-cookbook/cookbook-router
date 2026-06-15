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

  it('parses inline defineSearch and defineHash helpers inside defineRoutes trees', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        `import { defineHash, defineRoutes, defineSearch } from '@cookbook/router';

export const routes = defineRoutes([
  {
    id: 'article',
    path: '/article',
    search: defineSearch({ q: { type: 'string', optional: true } } as const),
    hash: defineHash({ type: 'enum', values: ['comments'], optional: true } as const),
  },
] as const);
`,
      ).routes,
    ).toEqual([
      {
        id: 'article',
        path: '/article',
        search: { q: { type: 'string', optional: true } },
        hash: { type: 'enum', values: ['comments'], optional: true },
      },
    ]);
  });
  it('carries static defineRoutes options', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        'export const routes = defineRoutes([], { pathOptions: { prune: "all" } });',
      ).routeOptions,
    ).toEqual({ pathOptions: { prune: 'all' } });
  });

  it('parses defineRouteTree declarations with local route declarations', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        `import { defineRoute, defineRouteTree } from '@cookbook/router';

const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
const articleRoute = defineRoute({
  id: 'blog.article',
  parent: 'blog',
  path: 'articles/{slug}',
} as const);

export const routes = defineRouteTree({
  routes: [blogRoute, articleRoute],
  pathOptions: { prune: 'all' },
} as const);
`,
      ),
    ).toEqual({
      routes: [
        { id: 'blog', path: '/blog' },
        { id: 'blog.article', parent: 'blog', path: 'articles/{slug}' },
      ],
      routeExports: [{ exportName: 'routes', kind: 'routes' }],
      routeOptions: { pathOptions: { prune: 'all' } },
    });
  });
  it('parses annotated defineRoute declarations and descriptors', () => {
    expect(
      parseStaticRouteModule(
        'annotated.route.ts',
        `import { defineRoute, defineSearch } from '@cookbook/router';
import type { RouteDeclaration } from '@cookbook/router';

const search: unknown = defineSearch({ q: { type: 'string', optional: true } } as const);
export const route: RouteDeclaration = defineRoute({
  id: 'annotated',
  path: '/annotated',
  search,
} as const);
`,
      ).routes,
    ).toEqual([
      {
        id: 'annotated',
        path: '/annotated',
        search: { q: { type: 'string', optional: true } },
      },
    ]);
  });

  it('parses exported defineRoute declarations with reusable URL descriptors', () => {
    expect(
      parseStaticRouteModule(
        'article.route.ts',
        `import { defineHash, defineRoute, defineSearch, mergeSearch } from '@cookbook/router';

const querySearch = defineSearch({ query: { type: 'string', optional: true } } as const);
export const articleSearch = mergeSearch(querySearch, {
  page: { type: 'int', default: 1 },
} as const);
const articleHash = defineHash({ type: 'enum', values: ['comments', 'share'], optional: true } as const);

export const articleRoute = defineRoute({
  id: 'blog.articles.show',
  parent: 'blog',
  path: 'articles/{slug}',
  search: articleSearch,
  hash: articleHash,
  view: ArticlePage,
} as const);
`,
      ),
    ).toEqual({
      routes: [
        {
          id: 'blog.articles.show',
          parent: 'blog',
          path: 'articles/{slug}',
          search: {
            query: { type: 'string', optional: true },
            page: { type: 'int', default: 1 },
          },
          hash: { type: 'enum', values: ['comments', 'share'], optional: true },
          view: expect.any(Function),
        },
      ],
      routeExports: [{ exportName: 'articleRoute', kind: 'route' }],
    });
  });

  it('surfaces duplicate mergeSearch descriptor keys from static evaluation', () => {
    expect(() =>
      parseStaticRouteModule(
        'article.route.ts',
        `import { defineRoute, defineSearch, mergeSearch } from '@cookbook/router';

const baseSearch = defineSearch({ q: { type: 'string', optional: true } } as const);
const articleSearch = mergeSearch(baseSearch, { q: { type: 'int', optional: true } } as const);

export const articleRoute = defineRoute({
  id: 'article',
  path: '/article',
  search: articleSearch,
} as const);
`,
      ),
    ).toThrow('Duplicate search descriptor key "q" passed to mergeSearch().');
  });

  it('resolves local static constants referenced by route declarations', () => {
    expect(
      parseStaticRouteModule(
        'constants.route.ts',
        `import { defineRoute } from '@cookbook/router';

const routeId = 'article.show' as const;
const routePath = '/articles/{slug}' as const;
const title = 'Article details';
const routeMeta = {
  title,
  section: 'journal',
} as const;
const hashValues = ['comments', 'share'] as const;

export const route = defineRoute({
  id: routeId,
  path: routePath,
  meta: routeMeta,
  hash: { type: 'enum', values: hashValues, optional: true },
} as const);
`,
      ).routes,
    ).toEqual([
      {
        id: 'article.show',
        path: '/articles/{slug}',
        meta: { title: 'Article details', section: 'journal' },
        hash: { type: 'enum', values: ['comments', 'share'], optional: true },
      },
    ]);
  });

  it('resolves static constants imported by route files', async () => {
    const { loadRouteFiles } = await import('./load-route-files');
    const { createMemoryFileSystem } = await import('../test-helpers');
    const fs = createMemoryFileSystem({
      'src/route-constants.ts': `export const articleRouteId = 'article.show' as const;
export const articleRoutePath = '/articles/{slug}' as const;
export const articleMeta = { title: 'Article' } as const;
export const hashValues = ['comments'] as const;
`,
      'src/article.route.ts': `import { defineRoute } from '@cookbook/router';
import { articleMeta, articleRouteId as routeId, articleRoutePath, hashValues } from './route-constants';

export const articleRoute = defineRoute({
  id: routeId,
  path: articleRoutePath,
  meta: articleMeta,
  hash: { type: 'enum', values: hashValues, optional: true },
} as const);
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['src/article.route.ts'], fs })).resolves.toEqual([
      {
        path: 'src/article.route.ts',
        routeExports: [{ exportName: 'articleRoute', kind: 'route' }],
        routes: [
          {
            id: 'article.show',
            path: '/articles/{slug}',
            meta: { title: 'Article' },
            hash: { type: 'enum', values: ['comments'], optional: true },
          },
        ],
      },
    ]);
  });

  it('parses named-exported defineRoutes aliases with the exported name', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        `import { defineRoutes } from '@cookbook/router';

const appRoutes = defineRoutes([{ id: 'home', path: '/' }] as const);

export { appRoutes as routes };
`,
      ),
    ).toEqual({
      routes: [{ id: 'home', path: '/' }],
      routeExports: [{ exportName: 'routes', kind: 'routes' }],
    });
  });

  it('parses named-exported defineRouteTree aliases with the exported name', () => {
    expect(
      parseStaticRouteModule(
        'routes.ts',
        `import { defineRoute, defineRouteTree } from '@cookbook/router';

const homeRoute = defineRoute({ id: 'home', path: '/' } as const);
const tree = defineRouteTree({ routes: [homeRoute] } as const);

export { tree as routes };
`,
      ),
    ).toEqual({
      routes: [{ id: 'home', path: '/' }],
      routeExports: [{ exportName: 'routes', kind: 'routeTree' }],
    });
  });
});
