import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import {
  resolveEffectiveRouteOptions,
  resolveRouteInput,
  resolveRouteInputFromEffectiveOptions,
  resolveRouteInputWithOptions,
  resolveRoutes,
} from './resolve-route-input';

describe('resolve route input', () => {
  it('resolves direct routes without loading config', async () => {
    await expect(resolveRoutes({ routes: sampleRoutes })).resolves.toEqual(sampleRoutes);
    await expect(resolveRouteInput({ routes: sampleRoutes })).resolves.toMatchObject({
      routes: sampleRoutes,
    });
  });

  it('loads route files from a discovered config and scopes outDir to the config root', async () => {
    const fs = createMemoryFileSystem({
      'apps/dashboard/cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
export default defineRouterConfig({ routeFiles: 'routes.json', outDir: '.generated' } as const);
`,
      'apps/dashboard/routes.json': JSON.stringify({ routes: sampleRoutes }),
    });

    const resolved = await resolveRouteInputWithOptions({ cwd: 'apps/dashboard', fs });

    expect(resolved.options.outDir).toBe('apps/dashboard/.generated');
    expect(resolved.options.configFile).toBe('apps/dashboard/cookbook-router.config.ts');
    expect(resolved.routeFile.routes).toEqual(sampleRoutes);
  });

  it('lets explicit routeFiles override config routeFiles while preserving explicit outDir', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `export default { routeFiles: 'missing/**/*.route.tsx', outDir: '.from-config' } as const;`,
      'routes.json': JSON.stringify({ routes: sampleRoutes }),
    });

    await expect(
      resolveEffectiveRouteOptions({ routeFiles: ['routes.json'], outDir: '.explicit', fs }),
    ).resolves.toMatchObject({
      routeFiles: ['routes.json'],
      outDir: '.explicit',
    });
  });

  it('allows empty route file patterns only when requested', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `export default { routeFiles: 'missing/**/*.route.tsx' } as const;`,
    });

    await expect(resolveEffectiveRouteOptions({ fs })).rejects.toThrow('No route files matched');
    await expect(
      resolveEffectiveRouteOptions({ fs, allowEmptyRouteFiles: true }),
    ).resolves.toMatchObject({
      outDir: '.cookbook-router',
    });
  });

  it('throws when no routes or routeFiles are available after effective option resolution', async () => {
    await expect(resolveRouteInputFromEffectiveOptions({})).rejects.toThrow(
      'No routes or routeFiles were provided.',
    );
  });
});
