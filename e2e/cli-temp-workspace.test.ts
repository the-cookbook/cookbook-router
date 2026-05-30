import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  generateCommand,
  manifestCommand,
  runCli,
  validateCommand,
  watchCommand,
} from '@cookbook/router-cli';
import { createMemoryFileSystem } from '../packages/router-cli/src/test-helpers';

const validRoutes = [
  {
    id: 'root',
    path: '/',
    children: [
      { id: 'home', index: true, meta: { title: 'Home' } },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: { tab: { type: 'one', optional: true } },
        hash: ['profile', 'settings'],
      },
    ],
  },
] as const;

describe('CLI integration in isolated workspaces', () => {
  it('generates contracts, registration, and manifest into a real temporary workspace', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'cookbook-router-e2e-'));
    const routeFile = join(workspace, 'routes.json');
    const outDir = join(workspace, '.cookbook-router');

    try {
      await writeFile(routeFile, JSON.stringify({ routes: validRoutes }), 'utf8');

      await expect(runCli(['generate', '--routes', routeFile, '--out-dir', outDir])).resolves.toBe(
        0,
      );
      await expect(readFile(join(outDir, 'contracts.ts'), 'utf8')).resolves.toContain(
        'export interface RouterContracts',
      );
      await expect(readFile(join(outDir, 'contracts.ts'), 'utf8')).resolves.toContain(
        "'users.show'",
      );
      await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain(
        '/users/{id:int}',
      );
      await expect(readFile(join(outDir, 'register.d.ts'), 'utf8')).resolves.toContain(
        "declare module '@cookbook/router'",
      );
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('validates route failures through the public validate command', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    });

    const result = await validateCommand({ routeFiles: ['routes.json'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('index');
  });

  it('generates only the manifest when the manifest command is used', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: validRoutes }) });

    const result = await manifestCommand({ routeFiles: ['routes.json'], fs, outDir: 'generated' });

    expect(result.ok).toBe(true);
    expect(fs.files.get('generated/manifest.json')).toContain('users.show');
    expect(fs.files.has('generated/contracts.ts')).toBe(false);
  });

  it('watch mode regenerates contracts, registration, and manifest after route file changes', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: validRoutes }) });
    let changeCount = 0;
    let resolveChange!: () => void;
    const changed = new Promise<void>((resolve) => {
      resolveChange = resolve;
    });
    const watcher = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      outDir: 'generated',
      debounceMs: 0,
      onChange: () => {
        changeCount += 1;
        if (changeCount === 2) {
          resolveChange();
        }
      },
    });

    await expect(watcher.initial).resolves.toMatchObject({ ok: true });
    expect(fs.files.get('generated/contracts.ts')).toContain('users.show');

    await fs.writeFile(
      'routes.json',
      JSON.stringify({ routes: [{ id: 'about', path: '/about' }] }),
    );
    fs.emit('routes.json');
    await changed;

    expect(fs.files.get('generated/contracts.ts')).toContain('about');
    expect(fs.files.get('generated/manifest.json')).toContain('/about');
    expect(fs.files.get('generated/register.d.ts')).toContain("declare module '@cookbook/router'");

    watcher.close();
  });

  it('generateCommand creates parent directories in temp workspaces', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'cookbook-router-e2e-'));
    const routeFile = join(workspace, 'config', 'routes.json');
    const outDir = join(workspace, 'generated', 'router');

    try {
      await mkdir(join(workspace, 'config'));
      await writeFile(routeFile, JSON.stringify({ routes: validRoutes }), 'utf8');
      await expect(generateCommand({ routeFiles: [routeFile], outDir })).resolves.toMatchObject({
        ok: true,
      });
      await expect(readFile(join(outDir, 'contracts.ts'), 'utf8')).resolves.toContain(
        'RouteParams',
      );
      await expect(readFile(join(outDir, 'register.d.ts'), 'utf8')).resolves.toContain(
        'RouterContracts',
      );
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
