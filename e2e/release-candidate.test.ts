import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const packageDirectories = ['packages/router', 'packages/router-react', 'packages/router-cli'];
const requiredScripts = [
  'format:check',
  'validate:rc',
  'lint',
  'typecheck:all',
  'test:coverage',
  'test:examples',
  'test:e2e',
  'build:packages',
  'build:examples',
  'publish:dry-run',
  'test:consumer-trial',
];

describe('release candidate repository state', () => {
  it('keeps release validation wired into the root package scripts', () => {
    const packageJson = readJson('package.json');

    for (const script of requiredScripts) {
      expect(packageJson.scripts[script]).toBeTruthy();
    }

    for (const script of requiredScripts) {
      expect(packageJson.scripts['test:ci']).toContain(`pnpm ${script}`);
    }
  });

  it('keeps package publish metadata aligned with public exports', () => {
    for (const packageDirectory of packageDirectories) {
      const packageJson = readJson(join(packageDirectory, 'package.json'));
      const rootExport = packageJson.exports['.'];

      expect(packageJson.private).toBeUndefined();
      expect(packageJson.main).toBe(rootExport.require);
      expect(packageJson.module).toBe(rootExport.import);
      expect(packageJson.types).toBe(rootExport.types);
      expect(packageJson.sideEffects).toBe(false);
      expect(packageJson.files).toContain('dist');
      expect(packageJson.publishConfig).toEqual({ access: 'public' });

      if (packageDirectory === 'packages/router-cli') {
        expect(packageJson.bin).toEqual({
          'cookbook-router': './dist/index.js',
          cbr: './dist/index.js',
        });
      }
    }
  });

  it('keeps package internals hidden from package exports', () => {
    for (const packageDirectory of packageDirectories) {
      const packageJson = readJson(join(packageDirectory, 'package.json'));
      const exportKeys = Object.keys(packageJson.exports);

      expect(exportKeys).toEqual(['.', './package.json']);
    }
  });

  it('keeps documentation files in place for the release candidate', () => {
    const requiredDocumentation = [
      'README.md',
      'CONTRIBUTING.md',
      'SECURITY.md',
      'CHANGELOG.md',
      'docs/getting-started.md',
      'docs/routing.md',
      'docs/navigation.md',
      'docs/search-and-hash.md',
      'docs/ssr.md',
      'docs/middleware.md',
      'docs/lifecycle.md',
      'docs/testing.md',
      'docs/codegen.md',
      'docs/contracts.md',
      'docs/react-integration.md',
    ];

    for (const file of requiredDocumentation) {
      expect(readFileSync(join(root, file), 'utf8').trim()).not.toBe('');
    }
  });

  it('does not include disabled or focused tests', () => {
    const testFiles = listFiles(root).filter((file) => /\.test\.tsx?$/.test(file));

    for (const file of testFiles) {
      const content = readFileSync(file, 'utf8');

      expect(content).not.toMatch(/\b(?:describe|it|test)\.skip\s*\(/);
      expect(content).not.toMatch(/\b(?:describe|it|test)\.only\s*\(/);
    }
  });
});

function readJson(path: string): Record<string, any> {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function listFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist', 'coverage', '.tmp'].includes(entry)) {
      continue;
    }

    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...listFiles(path));
    } else {
      files.push(path);
    }
  }

  return files;
}
