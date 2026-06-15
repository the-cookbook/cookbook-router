import { describe, expect, it } from 'vitest';
import {
  ROUTER_CONFIG_FILENAMES,
  getRouterConfigFilenames,
  getRouterConfigWatchCandidates,
} from './router-config-filenames';

describe('router config filenames', () => {
  it('exposes the supported config filename candidates in priority order', () => {
    expect(getRouterConfigFilenames()).toBe(ROUTER_CONFIG_FILENAMES);
    expect(getRouterConfigFilenames()).toEqual([
      'cookbook-router.config.ts',
      'cookbook-router.config.mts',
      'cookbook-router.config.cts',
      'cookbook-router.config.js',
      'cookbook-router.config.mjs',
      'cookbook-router.config.cjs',
    ]);
  });

  it('scopes watch candidates to a custom cwd', () => {
    expect(getRouterConfigWatchCandidates('apps/dashboard')).toEqual([
      'apps/dashboard/cookbook-router.config.ts',
      'apps/dashboard/cookbook-router.config.mts',
      'apps/dashboard/cookbook-router.config.cts',
      'apps/dashboard/cookbook-router.config.js',
      'apps/dashboard/cookbook-router.config.mjs',
      'apps/dashboard/cookbook-router.config.cjs',
    ]);
  });

  it('returns relative candidates for the default cwd', () => {
    expect(getRouterConfigWatchCandidates()).toEqual([...ROUTER_CONFIG_FILENAMES]);
  });
});
