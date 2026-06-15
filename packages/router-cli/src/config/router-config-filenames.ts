import { join } from 'node:path';

export const ROUTER_CONFIG_FILENAMES = [
  'cookbook-router.config.ts',
  'cookbook-router.config.mts',
  'cookbook-router.config.cts',
  'cookbook-router.config.js',
  'cookbook-router.config.mjs',
  'cookbook-router.config.cjs',
] as const;

export type RouterConfigFilename = (typeof ROUTER_CONFIG_FILENAMES)[number];

export function getRouterConfigFilenames(): readonly RouterConfigFilename[] {
  return ROUTER_CONFIG_FILENAMES;
}

export function getRouterConfigWatchCandidates(cwd = '.'): readonly string[] {
  const root = cwd === '.' ? '' : cwd;

  return ROUTER_CONFIG_FILENAMES.map((filename) => (root ? join(root, filename) : filename));
}
