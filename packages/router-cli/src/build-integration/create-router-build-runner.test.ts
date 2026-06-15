import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import {
  createRouterBuildRunner,
  formatRouterBuildErrors,
  getFallbackWatchPaths,
  normalizeBuildPath,
  normalizeBuilderRouteFiles,
  resolveBuildPath,
  resolveRouterBuildWatchState,
  resolveUniqueBuildPaths,
  toRouterBuildCliOptions,
} from './create-router-build-runner';

describe('createRouterBuildRunner', () => {
  it('generates artifacts through discovered config and returns watch state', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `export default { routeFiles: 'routes.json', outDir: '.generated' } as const;`,
      'routes.json': JSON.stringify({ routes: sampleRoutes }),
    });

    const result = await createRouterBuildRunner({ fs }).run();

    expect(result.ok).toBe(true);
    expect(result.files).toContain('.generated/contracts.ts');
    expect(result.watchPaths).toEqual([
      resolveBuildPath('.', 'cookbook-router.config.ts'),
      resolveBuildPath('.', 'routes.json'),
    ]);
    expect(result.outDir).toBe(resolveBuildPath('.', '.generated'));
    expect(fs.files.get('.generated/routes.ts')).toBeUndefined();
  });

  it('returns structured errors and fallback watch paths on generation failure', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `export default { routeFiles: 'routes.json' } as const;`,
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    });

    const result = await createRouterBuildRunner({ fs }).run();

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('index');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.watchPaths).toContain(resolveBuildPath('.', 'cookbook-router.config.ts'));
  });

  it('normalizes plugin options into CLI options without adding undefined fields', () => {
    expect(
      toRouterBuildCliOptions({
        configFile: 'router.config.ts',
        routeFiles: 'src/**/*.route.tsx',
        outDir: '.router',
        cwd: 'apps/site',
      }),
    ).toEqual({
      configFile: 'router.config.ts',
      routeFiles: ['src/**/*.route.tsx'],
      outDir: '.router',
      cwd: 'apps/site',
    });
    expect(toRouterBuildCliOptions({})).toEqual({});
  });

  it('normalizes route file options and fallback watch paths', () => {
    expect(normalizeBuilderRouteFiles(undefined)).toBeUndefined();
    expect(normalizeBuilderRouteFiles('routes.ts')).toEqual(['routes.ts']);
    expect(normalizeBuilderRouteFiles(['a.ts', 'b.ts'])).toEqual(['a.ts', 'b.ts']);
    expect(getFallbackWatchPaths({ cwd: 'apps/site', routeFiles: 'src/**/*.route.tsx' })).toContain(
      resolveBuildPath('apps/site', 'src'),
    );
  });

  it('resolves and deduplicates build paths', () => {
    expect(normalizeBuildPath('a\\b\\c')).toBe('a/b/c');
    expect(resolveUniqueBuildPaths('.', ['routes.ts', './routes.ts'])).toEqual([
      resolveBuildPath('.', 'routes.ts'),
    ]);
    expect(resolveBuildPath('apps/site', 'src/routes.ts')).toContain('apps/site');
  });

  it('formats build errors for bundlers', () => {
    expect(formatRouterBuildErrors(['first', 'second'])).toBe(
      '[cookbook-router] first\n[cookbook-router] second',
    );
  });

  it('resolves fallback watch state when config parsing fails', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `export default { routeFiles: getRoutes() } as const;`,
    });

    await expect(resolveRouterBuildWatchState({ fs })).resolves.toMatchObject({
      outDir: resolveBuildPath('.', '.cookbook-router'),
    });
  });
});
