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
      'routes.tsx': `import { createConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createConstraint({
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
      'routes.tsx': `import { createConstraint, defineRoutes } from '@cookbook/router';

function PostPage() { return null; }

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}', view: PostPage },
] as const, {
  pathConstraints: {
    slug: createConstraint({
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
      'routes.tsx': `import { createConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  // ignored: { bad: createConstraint() }
  slug: createConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
  /* ignoredBlock: createConstraint({}) */
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
  pathOptions: { trailingSlash: missingValue },
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

const constraints = createConstraintsSomewhereElse();

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
});
