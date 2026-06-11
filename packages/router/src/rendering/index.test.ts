import { describe, expect, it } from 'vitest';
import { renderRouteMatch } from './index';

describe('rendering public module', () => {
  it('re-exports the renderer-neutral route traversal API', () => {
    expect(typeof renderRouteMatch).toBe('function');
  });
});
