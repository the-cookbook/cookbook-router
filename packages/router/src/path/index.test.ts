import { describe, expect, it } from 'vitest';
import { compilePathPattern, createConstraint, normalizePathOptions } from './index';

describe('path public module', () => {
  it('re-exports path pattern and constraint helpers', () => {
    expect(compilePathPattern('/users/{id:int}', { id: 42 })).toBe('/users/42');
    expect(normalizePathOptions()).toEqual({ prune: 'all' });
    expect(typeof createConstraint).toBe('function');
  });
});
