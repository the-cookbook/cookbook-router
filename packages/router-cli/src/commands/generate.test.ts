import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { generateCommand, resolveRoutes } from './generate';

describe('generateCommand', () => {
  it('writes generated contracts, manifest, and registration files', async () => {
    const fs = createMemoryFileSystem();
    const result = await generateCommand({ routes: sampleRoutes, outDir: 'generated', fs });

    expect(result).toEqual({
      ok: true,
      files: ['generated/contracts.ts', 'generated/manifest.json', 'generated/register.d.ts'],
      errors: [],
    });
    expect(fs.files.get('generated/contracts.ts')).toContain('/* eslint-disable */');
    expect(fs.files.get('generated/contracts.ts')).toContain('export interface RouterContracts');
    expect(fs.files.get('generated/contracts.ts')).toContain('/* eslint-enable */');
    expect(fs.files.get('generated/manifest.json')).toContain('"users.show"');
    expect(fs.files.get('generated/register.d.ts')).toContain("declare module '@cookbook/router'");
  });

  it('loads routes from route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(resolveRoutes({ routeFiles: ['routes.json'], fs })).resolves.toEqual(sampleRoutes);
  });

  it('returns an error when no route source exists', async () => {
    await expect(resolveRoutes({})).rejects.toThrow('No routes');
  });

  it('returns command errors for invalid configuration', async () => {
    const result = await generateCommand({ routes: [{ id: 'bad', index: true, path: '/bad' }] });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('index');
  });

  it('refuses to write generated artifacts over route source files', async () => {
    const fs = createMemoryFileSystem({
      '.cookbook-router/contracts.ts': JSON.stringify({ routes: sampleRoutes }),
    });
    const result = await generateCommand({ routeFiles: ['.cookbook-router/contracts.ts'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain(
      'Refusing to write generated router artifacts over route source file',
    );
  });

  it('returns command errors for file system failures', async () => {
    const fs = createMemoryFileSystem();
    fs.writeFile = async () => {
      throw new Error('disk full');
    };

    const result = await generateCommand({ routes: sampleRoutes, fs });

    expect(result).toEqual({ ok: false, files: [], errors: ['disk full'] });
  });

  it('generates artifacts from a TypeScript route file using defineRoutes', async () => {
    const { mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-generate-tsx-'));
    const routeFile = join(dir, 'routes.tsx');
    const pageFile = join(dir, 'pages.tsx');
    const outDir = join(dir, '.cookbook-router');

    try {
      await writeFile(
        pageFile,
        `export function RootLayout() { return null; }
export function HomePage() { return null; }
export function UserPage() { return null; }
`,
      );
      await writeFile(
        routeFile,
        `import { defineRoutes } from '@cookbook/router';
import { HomePage, RootLayout, UserPage } from './pages';

export const lifecycleEvents: string[] = [];

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: { component: RootLayout },
    children: [
      { id: 'home', index: true, component: HomePage, meta: { title: 'Home' } },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: { tab: { type: 'one', optional: true } },
        hash: ['profile', 'settings', 'security'],
        component: UserPage,
        meta: { title: 'User', requiresAuth: true },
        lifecycle: {
          beforeEnter: () => {
            lifecycleEvents.push('users.beforeEnter');
          },
          afterEnter: () => {
            lifecycleEvents.push('users.afterEnter');
          },
        },
      },
    ],
  },
] as const);
`,
      );

      const result = await generateCommand({ routeFiles: [routeFile], outDir });

      expect(result.ok).toBe(true);
      const contracts = await readFile(join(outDir, 'contracts.ts'), 'utf8');
      expect(contracts).toContain("'users.show': { id: number };");
      expect(contracts).toContain('tab?: string');
      expect(contracts).toContain("'profile' | 'settings' | 'security'");
      await expect(readFile(join(outDir, 'register.d.ts'), 'utf8')).resolves.toContain(
        "declare module '@cookbook/router'",
      );
      await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain(
        'users.show',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('generates contracts from route files with custom path constraints', async () => {
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
  { id: 'post.show', path: '/posts/{slug:slug}', component: PostPage },
] as const, {
  pathConstraints: constraints,
});
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'post.show': { slug: string };",
    );
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('/posts/{slug:slug}');
  });

  it('generates contracts from route files with inline custom path constraints', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createConstraint, defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:inlineCliSlug}' },
] as const, {
  pathConstraints: {
    inlineCliSlug: createConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    }),
  },
});
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'post.show': { slug: string };",
    );
  });

  it('generates URLKit static search types and route URL options from route files', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{price:int}',
    search: {
      page: { value: 'int', default: 1 },
      tags: { value: 'string', type: 'many' },
      sort: { value: { type: 'enum', values: ['new', 'top'] }, optional: true },
    },
    hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
    url: { arrayFormat: 'comma' },
  },
] as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'products.show': { price: number };",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'products.show': { page: number; tags: readonly string[]; sort?: 'new' | 'top' };",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'products.show': 'details' | 'reviews' | undefined;",
    );
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('"arrayFormat": "comma"');
  });

  it('generates built-in URLKit constraint params as parsed numbers', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'users.show', path: '/users/{id:int}' },
] as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'users.show': { id: number };",
    );
  });
});
