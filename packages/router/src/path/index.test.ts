import { describe, expect, it } from 'vitest';
import { createPathConstraint, normalizePathOptions, prunePathname } from './index';

describe('path public module', () => {
  it('re-exports path options and constraint helpers', () => {
    expect(normalizePathOptions()).toEqual({ prune: 'all' });
    expect(prunePathname('/users//42/')).toBe('/users/42');
    expect(typeof createPathConstraint).toBe('function');
  });
});
