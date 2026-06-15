import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem } from '../test-helpers';
import {
  expandRouteFilePatterns,
  getRouteFilePatternWatchPaths,
} from './expand-route-file-patterns';

describe('expandRouteFilePatterns', () => {
  it('expands route file globs deterministically', async () => {
    const fs = createMemoryFileSystem({
      'src/root.route.tsx': '',
      'src/admin/users.route.ts': '',
      'src/admin/users.ts': '',
      'src/.cookbook-router/generated.route.ts': '',
    });

    await expect(
      expandRouteFilePatterns({
        patterns: 'src/**/*.route.{ts,tsx}',
        fs,
        excludeDirs: ['src/.cookbook-router'],
      }),
    ).resolves.toEqual(['src/admin/users.route.ts', 'src/root.route.tsx']);
  });

  it('returns glob roots and concrete files as watch paths', () => {
    expect(
      getRouteFilePatternWatchPaths({
        patterns: ['src/**/*.route.{ts,tsx}', 'routes.json'],
      }),
    ).toEqual(['src', 'routes.json']);
  });
});
