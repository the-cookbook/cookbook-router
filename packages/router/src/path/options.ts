import type { UrlPathMatchOptions } from '@cookbook/urlkit';

/**
 * Path pruning mode applied during validation, matching, and href compilation.
 *
 * `all` removes duplicate and trailing slashes, `duplication` removes only
 * repeated slashes, `trailing` removes only trailing slashes, and `false`
 * preserves authored pathnames.
 */
export type PathPruneOption = 'all' | 'duplication' | 'trailing' | false;

/** Router-owned path normalization options. */
export interface RouterPathOptions {
  readonly prune?: PathPruneOption;
}

/** Controls URLKit path matching for serialized path input. */
export interface RouterPathMatchOptions extends UrlPathMatchOptions {}

export const DEFAULT_PATH_OPTIONS = {
  prune: 'all',
} as const satisfies Required<RouterPathOptions>;

/** Normalizes partial path options to router defaults. */
export function normalizePathOptions(options?: RouterPathOptions): Required<RouterPathOptions> {
  return {
    prune: options?.prune ?? DEFAULT_PATH_OPTIONS.prune,
  };
}

/** Applies configured slash pruning to a pathname. */
export function prunePathname(pathname: string, options?: RouterPathOptions): string {
  const prune = normalizePathOptions(options).prune;
  let next = pathname || '/';

  if (prune === 'all' || prune === 'duplication') {
    next = next.replace(/\/{2,}/g, '/');
  }

  if (prune === 'all' || prune === 'trailing') {
    next = next.length > 1 ? next.replace(/\/+$/g, '') : next;
  }

  return next || '/';
}
