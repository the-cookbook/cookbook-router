import { describe, expect, it } from 'vitest';
import { compilePathPattern, createPathConstraint, normalizePathOptions } from './index';

describe('path public module', () => {
  it('re-exports path pattern and constraint helpers', () => {
    expect(compilePathPattern('/users/{id:int}', { id: 42 })).toBe('/users/42');
    expect(normalizePathOptions()).toEqual({ prune: 'all' });
    expect(typeof createPathConstraint).toBe('function');
  });
});
