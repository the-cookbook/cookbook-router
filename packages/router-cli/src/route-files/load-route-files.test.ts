import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { loadRouteFiles, validateRouteFiles } from './load-route-files';

describe('validateRouteFiles', () => {
  it('loads and validates JSON route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).resolves.toEqual([
      { path: 'routes.json', routes: sampleRoutes },
    ]);
  });

  it('loads multiple files in order', async () => {
    const fs = createMemoryFileSystem({
      'a.json': JSON.stringify({ routes: [{ id: 'a', path: '/a' }] }),
      'b.json': JSON.stringify({ routes: [{ id: 'b', path: '/b' }] }),
    });

    const sources = await loadRouteFiles({ routeFiles: ['a.json', 'b.json'], fs });

    expect(sources.map((source) => source.path)).toEqual(['a.json', 'b.json']);
  });

  it('validates multiple static route-tree files without forcing modular composition rules', async () => {
    const fs = createMemoryFileSystem({
      'src/a.route.tsx': `import { defineRoutes } from '@cookbook/router';
export const routes = defineRoutes([
  {
    id: 'a',
    path: '/a',
    children: [
      { id: 'a.details', path: '/a/details' },
    ],
  },
] as const);
`,
      'src/b.route.tsx': `import { defineRoutes } from '@cookbook/router';
export const routes = defineRoutes([
  { id: 'b', path: '/b' },
] as const);
`,
    });

    await expect(
      validateRouteFiles({ routeFiles: ['src/a.route.tsx', 'src/b.route.tsx'], fs }),
    ).resolves.toHaveLength(2);
  });

  it('rejects conflicting pathOptions across route files during validation', async () => {
    const fs = createMemoryFileSystem({
      'src/a.route.tsx': `import { defineRoutes } from '@cookbook/router';
export const routes = defineRoutes([
  { id: 'a', path: '/a' },
] as const, { pathOptions: { prune: 'all' } });
`,
      'src/b.route.tsx': `import { defineRoutes } from '@cookbook/router';
export const routes = defineRoutes([
  { id: 'b', path: '/b' },
] as const, { pathOptions: { prune: 'trailing' } });
`,
    });

    await expect(
      validateRouteFiles({ routeFiles: ['src/a.route.tsx', 'src/b.route.tsx'], fs }),
    ).rejects.toThrow('Conflicting pathOptions');
  });

  it('rejects duplicate path constraint names across route files during validation', async () => {
    const fs = createMemoryFileSystem({
      'src/a.route.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';
export const routes = defineRoutes([
  { id: 'a', path: '/a/{slug:slug}' },
] as const, {
  pathConstraints: {
    slug: createPathConstraint({ parse: () => undefined, verify: () => undefined }),
  },
});
`,
      'src/b.route.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';
export const routes = defineRoutes([
  { id: 'b', path: '/b/{slug:slug}' },
] as const, {
  pathConstraints: {
    slug: createPathConstraint({ parse: () => undefined, verify: () => undefined }),
  },
});
`,
    });

    await expect(
      validateRouteFiles({ routeFiles: ['src/a.route.tsx', 'src/b.route.tsx'], fs }),
    ).rejects.toThrow('Duplicate path constraint name "slug"');
  });

  it('rejects route file paths with null bytes before reading', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(validateRouteFiles({ routeFiles: ['routes.json\0'], fs })).rejects.toThrow(
      'null byte',
    );
  });

  it('fails invalid JSON', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': '{' });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).rejects.toThrow(
      'invalid JSON',
    );
  });

  it('fails when routes array is missing', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({}) });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).rejects.toThrow(
      'routes array',
    );
  });

  it('fails invalid route definitions', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).rejects.toThrow('index');
  });

  it('loads routes from JavaScript modules for real CLI usage', async () => {
    const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-route-module-'));
    const routeFile = join(dir, 'routes.mjs');

    try {
      await writeFile(routeFile, `export const routes = [{ id: 'home', path: '/' }];`);

      await expect(loadRouteFiles({ routeFiles: [routeFile] })).resolves.toEqual([
        { path: routeFile, routes: [{ id: 'home', path: '/' }] },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('loads routes from TypeScript and TSX modules for real CLI usage', async () => {
    const { mkdtemp, rm, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(join(process.cwd(), '.tmp-route-tsx-module-'));
    const routeFile = join(dir, 'routes.tsx');
    const pageFile = join(dir, 'pages.tsx');

    try {
      await writeFile(pageFile, `export function HomePage() { return null; }`);
      await writeFile(
        routeFile,
        `import { defineRoutes } from '@cookbook/router';
import { HomePage } from './pages';

export const routes = defineRoutes([
  { id: 'home', path: '/', view: HomePage },
] as const);
`,
      );

      const sources = await loadRouteFiles({ routeFiles: [routeFile] });

      expect(sources).toHaveLength(1);
      expect(sources[0]?.path).toBe(routeFile);
      expect(sources[0]?.routes[0]?.id).toBe('home');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('defers configured intercept target validation until all modular route files are merged', async () => {
    const fs = createMemoryFileSystem({
      'app/pages/root.route.tsx': `import { defineRoute } from '@cookbook/router';

export const rootRoute = defineRoute({
  id: 'root',
  path: '/',
  layout: {
    view: RootLayout,
    slots: {
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: ['new-message'],
      view: ModalView,
    },
  },
} as const);
`,
      'app/pages/messages/new/new-message.route.tsx': `import { defineRoute } from '@cookbook/router';

export const newMessageRoute = defineRoute({
  id: 'new-message',
  parent: 'root',
  path: 'messages/new',
} as const);
`,
    });

    await expect(
      validateRouteFiles({
        routeFiles: ['app/pages/root.route.tsx', 'app/pages/messages/new/new-message.route.tsx'],
        fs,
      }),
    ).resolves.toHaveLength(2);
  });

  it('rejects configured intercept targets that are still missing after merge', async () => {
    const fs = createMemoryFileSystem({
      'app/pages/root.route.tsx': `import { defineRoute } from '@cookbook/router';

export const rootRoute = defineRoute({
  id: 'root',
  path: '/',
  layout: {
    view: RootLayout,
    slots: {
      modal: true,
    },
  },
  intercepts: {
    modal: {
      to: ['new-message'],
      view: ModalView,
    },
  },
} as const);
`,
    });

    await expect(
      validateRouteFiles({ routeFiles: ['app/pages/root.route.tsx'], fs }),
    ).rejects.toThrow(/new-message/);
  });

  it('loads static route modules with slot view shorthand and declaration-only slots', async () => {
    const fs = createMemoryFileSystem({
      'src/routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { LayoutPage, HeaderPage, ModalPage, HomePage } from './pages';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      view: LayoutPage,
      slots: {
        header: HeaderPage,
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: ['modal'],
        view: ModalPage,
      },
    },
    children: [
      { id: 'home', index: true, view: HomePage },
    ],
  },
  { id: 'modal', path: '/modal', view: ModalPage },
] as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['src/routes.tsx'], fs });

    expect(sources[0]?.routes[0]?.id).toBe('root');
    expect(sources[0]?.routes[0]?.layout?.slots).toEqual({
      header: expect.any(Function),
      modal: true,
    });
  });

  it('loads static route modules with slot object view definitions', async () => {
    const fs = createMemoryFileSystem({
      'src/routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { LayoutPage, HeaderPage, HomePage } from './pages';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      view: LayoutPage,
      slots: {
        header: {
          view: HeaderPage,
          meta: { title: 'Header' },
        },
      },
    },
    children: [
      { id: 'home', index: true, view: HomePage },
    ],
  },
] as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['src/routes.tsx'], fs });

    expect(sources[0]?.routes[0]?.layout?.slots).toEqual({
      header: {
        view: expect.any(Function),
        meta: { title: 'Header' },
      },
    });
  });

  it('loads defineRoutes call after imports and typed declarations', async () => {
    const fs = createMemoryFileSystem({
      'src/routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { BlockedPage, HomePage, RootLayout, UserPage } from './pages';

export const lifecycleEvents: string[] = [];

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      view: RootLayout,
    },
    children: [
      {
        id: 'home',
        index: true,
        view: HomePage,
        meta: {
          title: 'Home',
        },
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: { type: 'string', optional: true },
        },
        hash: { type: 'enum', values: ['profile', 'settings', 'security'], optional: true },
        view: UserPage,
        meta: {
          title: 'User',
          requiresAuth: true,
        },
        lifecycle: {
          beforeEnter: () => {
            lifecycleEvents.push('users.beforeEnter');
          },
          afterEnter: () => {
            lifecycleEvents.push('users.afterEnter');
          },
        },
      },
      {
        id: 'blocked',
        path: 'blocked',
        view: BlockedPage,
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
] as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['src/routes.tsx'], fs });

    expect(sources[0]?.routes).toHaveLength(1);
    expect(sources[0]?.routes[0]?.id).toBe('root');
    expect(sources[0]?.routes[0]?.children).toHaveLength(3);
    expect(sources[0]?.routes[0]?.children?.[1]?.id).toBe('users.show');
  });

  it('handles brackets and escaped quotes inside route strings while extracting modules', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { ArticlePage, RootLayout } from './pages';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      view: RootLayout,
    },
    children: [
      {
        id: 'articles.show',
        path: "articles/{slug:regex([a-z]+)}",
        view: ArticlePage,
        meta: {
          title: "Article [preview] with \\\"quotes\\\"",
        },
        lifecycle: {
          beforeEnter: () => ({ ok: true }),
          afterEnter: async () => 1,
        },
      },
    ],
  },
] as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['routes.tsx'], fs });

    expect(sources[0]?.routes[0]?.id).toBe('root');
    expect(sources[0]?.routes[0]?.children?.[0]?.path).toBe('articles/{slug:regex([a-z]+)}');
    expect(sources[0]?.routes[0]?.children?.[0]?.meta).toEqual({
      title: 'Article [preview] with "quotes"',
    });
  });

  it('loads defineRoutes options with referenced custom path constraints', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};

function PostPage() { return null; }

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}', view: PostPage },
] as const, {
  pathConstraints: constraints,
});
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['routes.tsx'], fs });

    expect(sources[0]?.routes[0]?.path).toBe('/posts/{slug:slug}');
    expect(sources[0]?.routeOptions?.pathConstraints).toHaveProperty('slug');
  });

  it('loads defineRoutes options with inline custom path constraints', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

function PostPage() { return null; }

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}', view: PostPage },
] as const, {
  pathConstraints: {
    slug: createPathConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    }),
  },
});
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).resolves.toHaveLength(1);
  });

  it('keeps unknown custom constraint validation errors when options do not declare it', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:missingCliConstraint}' },
] as const);
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).rejects.toThrow(
      'missingCliConstraint',
    );
  });

  it('extracts options while skipping comments and escaped quoted text', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  // ignored: { bad: createPathConstraint() }
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
  /* ignoredBlock: createPathConstraint({}) */
};

export const routes = defineRoutes([
  {
    id: 'post.show',
    path: '/posts/{slug:slug}',
    meta: { title: 'It\\'s quoted' },
  },
] as const, {
  // pathConstraints: shouldNotWin,
  note: 'pathConstraints: fake',
  pathConstraints: constraints,
});
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['routes.tsx'], fs });

    expect(sources[0]?.routeOptions?.pathConstraints).toHaveProperty('slug');
    expect(sources[0]?.routes[0]?.meta).toEqual({ title: "It's quoted" });
  });

  it('rejects unsupported URLKit runtime builders in static route files', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { int } from '@cookbook/urlkit';

export const routes = defineRoutes([
  {
    id: 'products',
    path: '/products',
    search: { page: int().default(1) },
  },
] as const);
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).rejects.toThrow(
      'URLKit runtime builders',
    );
  });

  it('rejects URLKit runtime date builders with format options in static route files', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { date } from '@cookbook/urlkit';

export const routes = defineRoutes([
  {
    id: 'products',
    path: '/products',
    search: { from: date({ format: 'dd-MM-yyyy' }).optional() },
  },
] as const);
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).rejects.toThrow(
      'URLKit runtime builders',
    );
  });

  it('reports unsupported non-object defineRoutes options clearly', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'home', path: '/' },
] as const, getRouteOptions());
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).rejects.toThrow(
      'could not statically evaluate defineRoutes options',
    );
  });

  it('reports invalid static pathOptions clearly', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'home', path: '/' },
] as const, {
  pathOptions: { prune: missingValue },
});
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).rejects.toThrow(
      'pathOptions that the CLI cannot statically evaluate',
    );
  });

  it('reports unsupported dynamic pathConstraints declarations clearly', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

const constraints = createPathConstraintsSomewhereElse();

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}' },
] as const, {
  pathConstraints: constraints,
});
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['routes.tsx'], fs })).rejects.toThrow(
      'pathConstraints that the CLI cannot statically evaluate',
    );
  });

  it('loads defineRoute modules with imported reusable URL descriptors', async () => {
    const fs = createMemoryFileSystem({
      'src/url-state.ts': `import { defineHash, defineSearch, mergeSearch } from '@cookbook/router';
const querySearch = defineSearch({ q: { type: 'string', optional: true } } as const);
export const articleSearch = mergeSearch(querySearch, { page: { type: 'int', default: 1 } } as const);
export const articleHash = defineHash({ type: 'enum', values: ['comments'], optional: true } as const);
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
import { articleHash, articleSearch as search } from './url-state';

export const articleRoute = defineRoute({
  id: 'article',
  path: '/articles/{slug}',
  search,
  hash: articleHash,
} as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['src/article.route.tsx'], fs });

    expect(sources[0]?.routes[0]?.search).toEqual({
      q: { type: 'string', optional: true },
      page: { type: 'int', default: 1 },
    });
    expect(sources[0]?.routes[0]?.hash).toEqual({
      type: 'enum',
      values: ['comments'],
      optional: true,
    });
  });

  it('loads imported reusable URL descriptors exported through named aliases', async () => {
    const fs = createMemoryFileSystem({
      'src/url-state.ts': `import { defineHash, defineSearch, mergeSearch } from '@cookbook/router';
const baseSearch = defineSearch({ q: { type: 'string', optional: true } } as const);
const fullSearch = mergeSearch(baseSearch, { page: { type: 'int', default: 1 } } as const);
const sectionHash = defineHash({ type: 'enum', values: ['comments'], optional: true } as const);
export { fullSearch as articleSearch, sectionHash as articleHash };
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
import { articleHash, articleSearch as search } from './url-state';

export const articleRoute = defineRoute({
  id: 'article',
  path: '/articles/{slug}',
  search,
  hash: articleHash,
} as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['src/article.route.tsx'], fs });

    expect(sources[0]?.routes[0]?.search).toEqual({
      q: { type: 'string', optional: true },
      page: { type: 'int', default: 1 },
    });
    expect(sources[0]?.routes[0]?.hash).toEqual({
      type: 'enum',
      values: ['comments'],
      optional: true,
    });
  });

  it('loads imported static constants exported through named aliases', async () => {
    const fs = createMemoryFileSystem({
      'src/route-data.ts': `const articleId = 'article.show' as const;
const articleMeta = { title: 'Article' } as const;
export { articleId as routeId, articleMeta as meta };
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
import { meta, routeId as id } from './route-data';

export const articleRoute = defineRoute({
  id,
  path: '/articles/{slug}',
  meta,
} as const);
`,
    });

    const sources = await loadRouteFiles({ routeFiles: ['src/article.route.tsx'], fs });

    expect(sources[0]?.routes[0]).toMatchObject({
      id: 'article.show',
      meta: { title: 'Article' },
    });
  });

  it('rejects path aliases when they are required by route metadata', async () => {
    const fs = createMemoryFileSystem({
      'app/pages/overview/overview.route.tsx': `import { defineRoute, mergeSearch } from '@cookbook/router';
import { paginationSearch } from '@/lib/routes/filters/pagination';

const overviewSearch = {
  visitors: { type: 'string', optional: true },
} as const;

export const overviewRoute = defineRoute({
  id: 'overview',
  path: '/overview',
  search: mergeSearch(overviewSearch, paginationSearch),
} as const);
`,
    });

    await expect(
      loadRouteFiles({ routeFiles: ['app/pages/overview/overview.route.tsx'], fs }),
    ).rejects.toThrow('must use relative or absolute file paths');
  });

  it('ignores path aliases when they are only used by runtime route fields', async () => {
    const fs = createMemoryFileSystem({
      'app/pages/overview/overview.route.tsx': `import { defineRoute } from '@cookbook/router';
import { OverviewPage } from '@/pages/overview/page';

export const overviewRoute = defineRoute({
  id: 'overview',
  path: '/overview',
  view: OverviewPage,
} as const);
`,
    });

    const sources = await loadRouteFiles({
      routeFiles: ['app/pages/overview/overview.route.tsx'],
      fs,
    });

    expect(sources[0]?.routes[0]?.id).toBe('overview');
  });

  it('loads static route metadata from absolute file imports', async () => {
    const fs = createMemoryFileSystem({
      '/project/app/lib/routes/filters/pagination.ts': `import { defineSearch } from '@cookbook/router';
export const paginationSearch = defineSearch({
  page: { type: 'int', optional: true },
} as const);
`,
      '/project/app/pages/overview/overview.route.tsx': `import { defineRoute, mergeSearch } from '@cookbook/router';
import { paginationSearch } from '/project/app/lib/routes/filters/pagination';

const overviewSearch = {
  visitors: { type: 'string', optional: true },
} as const;

export const overviewRoute = defineRoute({
  id: 'overview',
  path: '/overview',
  search: mergeSearch(overviewSearch, paginationSearch),
} as const);
`,
    });

    const sources = await loadRouteFiles({
      routeFiles: ['/project/app/pages/overview/overview.route.tsx'],
      fs,
    });

    expect(sources[0]?.routes[0]?.search).toEqual({
      visitors: { type: 'string', optional: true },
      page: { type: 'int', optional: true },
    });
  });

  it('reports unresolved imports when they are required by route metadata', async () => {
    const fs = createMemoryFileSystem({
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
import { articleSearch } from './missing-url-state';

export const articleRoute = defineRoute({
  id: 'article',
  path: '/article',
  search: articleSearch,
} as const);
`,
    });

    await expect(loadRouteFiles({ routeFiles: ['src/article.route.tsx'], fs })).rejects.toThrow(
      'imports static route metadata from "./missing-url-state"',
    );
  });
});
