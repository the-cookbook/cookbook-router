import { describe, expect, test } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { generateCommand, resolveRoutes } from './generate';

describe('generateCommand', () => {
  test('writes generated contracts, manifest, and registration files', async () => {
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

  test('loads routes from route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(resolveRoutes({ routeFiles: ['routes.json'], fs })).resolves.toEqual(sampleRoutes);
  });

  test('returns an error when no route source exists', async () => {
    await expect(resolveRoutes({})).rejects.toThrow('No routes');
  });

  test('returns command errors for invalid configuration', async () => {
    const result = await generateCommand({ routes: [{ id: 'bad', index: true, path: '/bad' }] });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('index');
  });

  test('refuses to write generated artifacts over route source files', async () => {
    const fs = createMemoryFileSystem({
      '.cookbook-router/contracts.ts': JSON.stringify({ routes: sampleRoutes }),
    });
    const result = await generateCommand({ routeFiles: ['.cookbook-router/contracts.ts'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain(
      'Refusing to write generated router artifacts over route source file',
    );
  });

  test('returns command errors for file system failures', async () => {
    const fs = createMemoryFileSystem();
    fs.writeFile = async () => {
      throw new Error('disk full');
    };

    const result = await generateCommand({ routes: sampleRoutes, fs });

    expect(result).toEqual({ ok: false, files: [], errors: ['disk full'] });
  });

  test('generates artifacts from a TypeScript route file using defineRoutes', async () => {
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
      expect(contracts).toContain("'users.show': { id: string };");
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
});
