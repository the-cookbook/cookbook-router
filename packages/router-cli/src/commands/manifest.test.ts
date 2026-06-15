import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { manifestCommand } from './manifest';

describe('manifestCommand', () => {
  it('writes only manifest output', async () => {
    const fs = createMemoryFileSystem();
    const result = await manifestCommand({ routes: sampleRoutes, outDir: 'generated', fs });

    expect(result).toEqual({
      ok: true,
      files: ['generated/manifest.json'],
      errors: [],
      changedFiles: ['generated/manifest.json'],
    });
    expect(fs.files.get('generated/contracts.ts')).toBeUndefined();
    expect(JSON.parse(fs.files.get('generated/manifest.json') ?? '{}').routes).toHaveLength(3);
  });

  it('reports invalid route files', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', path: '/{' }] }),
    });
    const result = await manifestCommand({ routeFiles: ['routes.json'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toBeTruthy();
  });
});
