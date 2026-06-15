import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { generateRouterArtifacts } from './generate-router-artifacts';

describe('generateRouterArtifacts', () => {
  it('writes contracts, manifest, register, and changed-file metadata for direct routes', async () => {
    const fs = createMemoryFileSystem();

    const result = await generateRouterArtifacts({ routes: sampleRoutes, outDir: 'generated', fs });

    expect(result).toEqual({
      ok: true,
      files: ['generated/contracts.ts', 'generated/manifest.json', 'generated/register.d.ts'],
      errors: [],
      changedFiles: [
        'generated/contracts.ts',
        'generated/manifest.json',
        'generated/register.d.ts',
      ],
    });
    expect(fs.files.get('generated/contracts.ts')).toContain('export interface RouterContracts');
    expect(fs.files.get('generated/manifest.json')).toContain('users.show');
  });

  it('generates routes.ts when route files can be re-exported at runtime', async () => {
    const fs = createMemoryFileSystem({
      'app/root.route.tsx': `import { defineRoute } from '@cookbook/router';
export const rootRoute = defineRoute({ id: 'root', path: '/' } as const);
`,
    });

    const result = await generateRouterArtifacts({
      routeFiles: ['app/root.route.tsx'],
      outDir: '.router',
      fs,
    });

    expect(result.ok).toBe(true);
    expect(result.files).toContain('.router/routes.ts');
    expect(fs.files.get('.router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.router/routes.ts')).toContain('../app/root.route');
  });

  it('does not rewrite unchanged files on repeated generation', async () => {
    const fs = createMemoryFileSystem();

    await generateRouterArtifacts({ routes: sampleRoutes, fs });
    const result = await generateRouterArtifacts({ routes: sampleRoutes, fs });

    expect(result.ok).toBe(true);
    expect(result.changedFiles).toEqual([]);
  });

  it('rejects invalid route definitions before writing artifacts', async () => {
    const fs = createMemoryFileSystem();

    await expect(
      generateRouterArtifacts({ routes: [{ id: 'bad', index: true, path: '/bad' }], fs }),
    ).rejects.toThrow('index');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toBeUndefined();
  });
});
