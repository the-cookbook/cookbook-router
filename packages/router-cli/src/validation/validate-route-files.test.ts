import { describe, expect, test } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { loadRouteFiles, validateRouteFiles } from './validate-route-files';

describe('validateRouteFiles', () => {
  test('loads and validates JSON route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).resolves.toEqual([
      { path: 'routes.json', routes: sampleRoutes },
    ]);
  });

  test('loads multiple files in order', async () => {
    const fs = createMemoryFileSystem({
      'a.json': JSON.stringify({ routes: [{ id: 'a', path: '/a' }] }),
      'b.json': JSON.stringify({ routes: [{ id: 'b', path: '/b' }] }),
    });

    const sources = await loadRouteFiles({ routeFiles: ['a.json', 'b.json'], fs });

    expect(sources.map((source) => source.path)).toEqual(['a.json', 'b.json']);
  });

  test('rejects route file paths with null bytes before reading', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(validateRouteFiles({ routeFiles: ['routes.json\0'], fs })).rejects.toThrow(
      'null byte',
    );
  });

  test('fails invalid JSON', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': '{' });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).rejects.toThrow(
      'invalid JSON',
    );
  });

  test('fails when routes array is missing', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({}) });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).rejects.toThrow(
      'routes array',
    );
  });

  test('fails invalid route definitions', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    });

    await expect(validateRouteFiles({ routeFiles: ['routes.json'], fs })).rejects.toThrow('index');
  });

  test('loads routes from JavaScript modules for real CLI usage', async () => {
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

  test('loads routes from TypeScript and TSX modules for real CLI usage', async () => {
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
  { id: 'home', path: '/', component: HomePage },
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

  test('loads defineRoutes call after imports and typed declarations', async () => {
    const fs = createMemoryFileSystem({
      'src/routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { BlockedPage, HomePage, RootLayout, UserPage } from './pages';

export const lifecycleEvents: string[] = [];

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      component: RootLayout,
    },
    children: [
      {
        id: 'home',
        index: true,
        component: HomePage,
        meta: {
          title: 'Home',
        },
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: { type: 'one', optional: true },
        },
        hash: ['profile', 'settings', 'security'],
        component: UserPage,
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
        component: BlockedPage,
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

  test('handles brackets and escaped quotes inside route strings while extracting modules', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';
import { ArticlePage, RootLayout } from './pages';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      component: RootLayout,
    },
    children: [
      {
        id: 'articles.show',
        path: "articles/{slug:regex([a-z]+)}",
        component: ArticlePage,
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
});
