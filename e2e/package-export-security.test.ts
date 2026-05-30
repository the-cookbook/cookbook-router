import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const packages = [
  'packages/router/package.json',
  'packages/router-react/package.json',
  'packages/router-cli/package.json',
];

describe('package export hardening', () => {
  it('packages expose only root entrypoint and package metadata', async () => {
    for (const packageJsonPath of packages) {
      const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
        exports: Record<string, unknown>;
      };

      expect(Object.keys(manifest.exports).sort()).toEqual(['.', './package.json']);
    }
  });

  it('packages retain tree-shaking and declaration metadata', async () => {
    for (const packageJsonPath of packages) {
      const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
        sideEffects?: boolean;
        main?: string;
        module?: string;
        types?: string;
      };

      expect(manifest.sideEffects).toBe(false);
      expect(manifest.main).toMatch(/\.cjs$/);
      expect(manifest.module).toMatch(/\.js$/);
      expect(manifest.types).toMatch(/\.d\.ts$/);
    }
  });
});
