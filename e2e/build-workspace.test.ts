import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

async function runPnpm(args: readonly string[]) {
  return execFileAsync('pnpm', [...args], {
    cwd: rootDir,
    env: { ...process.env, CI: 'true' },
    maxBuffer: 10 * 1024 * 1024,
  });
}

describe('workspace build and resolution', () => {
  test('workspace package manifests resolve each other through workspace dependencies', async () => {
    const routerReact = JSON.parse(
      await readFile(join(rootDir, 'packages/router-react/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const routerCli = JSON.parse(
      await readFile(join(rootDir, 'packages/router-cli/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const reactBlog = JSON.parse(
      await readFile(join(rootDir, 'examples/react-blog/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const reactDashboard = JSON.parse(
      await readFile(join(rootDir, 'examples/react-dashboard/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };

    expect(routerReact.dependencies['@cookbook/router']).toBe('workspace:*');
    expect(routerCli.dependencies['@cookbook/router']).toBe('workspace:*');
    expect(reactBlog.dependencies['@cookbook/router']).toBe('workspace:*');
    expect(reactBlog.dependencies['@cookbook/router-react']).toBe('workspace:*');
    expect(reactDashboard.dependencies['@cookbook/router']).toBe('workspace:*');
    expect(reactDashboard.dependencies['@cookbook/router-react']).toBe('workspace:*');
  });

  test('package export maps point to build outputs for every package', async () => {
    for (const packageName of ['router', 'router-react', 'router-cli']) {
      const manifest = JSON.parse(
        await readFile(join(rootDir, 'packages', packageName, 'package.json'), 'utf8'),
      ) as {
        main: string;
        module: string;
        types: string;
        exports: Record<string, { import: string; require: string; types: string }>;
        sideEffects: boolean;
      };

      expect(manifest.main).toBe('./dist/index.cjs');
      expect(manifest.module).toBe('./dist/index.js');
      expect(manifest.types).toBe('./dist/index.d.ts');
      expect(manifest.exports['.']).toEqual({
        types: './dist/index.d.ts',
        import: './dist/index.js',
        require: './dist/index.cjs',
      });
      expect(manifest.sideEffects).toBe(false);
    }
  });

  test('root CI script covers typecheck, package tests, example tests, e2e tests, and builds', async () => {
    const manifest = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts['test:ci']).toContain('pnpm typecheck');
    expect(manifest.scripts['test:ci']).toContain('pnpm build');
    expect(manifest.scripts['test:ci']).toContain('pnpm test:examples');
    expect(manifest.scripts['test:ci']).toContain('pnpm test:e2e');
    expect(manifest.scripts['test:ci']).toContain('pnpm build:examples');
  });

  test('builds all workspace packages in CI', async () => {
    const result = await runPnpm(['build']);

    expect(result.stderr).not.toContain('error');
  });

  test('builds every example application in CI', async () => {
    const result = await runPnpm(['build:examples']);

    expect(result.stderr).not.toContain('error');
  });
});
