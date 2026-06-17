import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageNames = ['router', 'router-react', 'router-cli'] as const;

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('production release readiness', () => {
  it('published packages expose ESM, CJS, declarations, metadata, and tree-shaking hints', async () => {
    for (const packageName of packageNames) {
      const packageJson = await readJson(join('packages', packageName, 'package.json'));
      const exports = packageJson.exports as Record<string, Record<string, string> | string>;
      const rootExport = exports['.'] as Record<string, string>;

      expect(rootExport.import).toBe('./dist/index.js');
      expect(rootExport.require).toBe('./dist/index.cjs');
      expect(rootExport.types).toBe('./dist/index.d.ts');
      expect(exports['./package.json']).toBe('./package.json');
      expect(packageJson.sideEffects).toBe(false);
      expect(packageJson.license).toBe('MIT');
      expect(packageJson.publishConfig).toEqual({ access: 'public' });
      expect(packageJson.repository).toEqual({
        type: 'git',
        url: 'https://github.com/the-cookbook/cookbook-router.git',
      });
      expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'README.md', 'LICENSE']));
      expect(packageJson.engines).toEqual({
        node: '>=18',
      });

      if (packageName === 'router-cli') {
        expect(packageJson.bin).toEqual({
          'cookbook-router': './dist/bin.js',
          cbr: './dist/bin.js',
        });
      }
    }
  });

  it('root scripts include CI-compatible validation phases', async () => {
    const packageJson = await readJson('package.json');
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts['test:ci']).toContain('format:check');
    expect(scripts['test:ci']).toContain('validate:publish');
    expect(scripts['test:ci']).toContain('validate:exports');
    expect(scripts['test:ci']).toContain('test:coverage');
    expect(scripts['test:ci']).toContain('test:e2e');
    expect(scripts['test:ci']).toContain('build:packages');
    expect(scripts['test:ci']).toContain('build:examples');
    expect(scripts['validate:release']).toContain('test:coverage');
  });

  it('release governance files are present', async () => {
    await expect(readFile('LICENSE', 'utf8')).resolves.toContain('MIT License');
    await expect(readFile('SECURITY.md', 'utf8')).resolves.toContain('Reporting a vulnerability');
    await expect(readFile('.github/workflows/ci.yml', 'utf8')).resolves.toContain(
      'Test packages with coverage',
    );
    await expect(readFile('.github/workflows/release.yml', 'utf8')).resolves.toContain(
      'changesets/action@v1',
    );
    await expect(readFile('.github/workflows/version.yml', 'utf8')).resolves.toContain(
      'changeset status',
    );
    await expect(
      readFile('.github/PULL_REQUEST_TEMPLATE/pull_request_template.md', 'utf8'),
    ).resolves.toContain('pnpm test:coverage');
    await expect(readFile('.github/ISSUE_TEMPLATE/bug_report.yml', 'utf8')).resolves.toContain(
      '@cookbook/router',
    );
  });
});
