import { describe, expect, it } from 'vitest';
import { normalizePathOptions, prunePathname } from './options';

describe('path options', () => {
  it('normalizes defaults', () => {
    expect(normalizePathOptions()).toEqual({ prune: 'all' });
  });

  it('prunes duplicate and trailing slashes by default', () => {
    expect(prunePathname('/users//42/')).toBe('/users/42');
  });

  it('can prune only duplicated slashes', () => {
    expect(prunePathname('/users//42/', { prune: 'duplication' })).toBe('/users/42/');
  });

  it('can prune only trailing slashes', () => {
    expect(prunePathname('/users//42/', { prune: 'trailing' })).toBe('/users//42');
  });

  it('can preserve authored slashes', () => {
    expect(prunePathname('/users//42/', { prune: false })).toBe('/users//42/');
  });

  it('keeps the root pathname stable', () => {
    expect(prunePathname('/')).toBe('/');
    expect(prunePathname('')).toBe('/');
  });
});
