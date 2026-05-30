import { describe, expect, it } from 'vitest';
import { validateRoutes } from './validate-routes';

describe('validateRoutes security hardening', () => {
  it('rejects malformed route scalar fields before path handling', () => {
    expect(() => validateRoutes([{ id: 'bad', path: 42 } as never])).toThrow(
      'path must be a string',
    );
    expect(() => validateRoutes([{ id: 'bad', index: 'true' } as never])).toThrow(
      'index must be a boolean',
    );
    expect(() => validateRoutes([{ id: 'bad', layout: [] } as never])).toThrow(
      'layout must be an object',
    );
  });

  it('rejects malformed hash configuration', () => {
    expect(() => validateRoutes([{ id: 'bad', path: '/', hash: 'profile' } as never])).toThrow(
      'hash configuration must be an array',
    );
    expect(() => validateRoutes([{ id: 'bad', path: '/', hash: [1] } as never])).toThrow(
      'empty or non-string hash value',
    );
  });

  it('rejects unsafe search and meta keys that can poison generated contracts', () => {
    expect(() =>
      validateRoutes([{ id: 'bad', path: '/', search: { constructor: 'string' } } as never]),
    ).toThrow('search contains unsafe key "constructor"');
    expect(() =>
      validateRoutes([{ id: 'bad', path: '/', meta: { prototype: true } } as never]),
    ).toThrow('meta contains unsafe key "prototype"');
  });
});
