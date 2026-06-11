import { describe, expect, it } from 'vitest';
import { normalizeNavigateTarget } from './navigation-target';

describe('normalizeNavigateTarget', () => {
  it('normalizes positional route arguments', () => {
    expect(normalizeNavigateTarget('users.show', { params: { id: 1 } })).toEqual({
      route: 'users.show',
      options: { params: { id: 1 } },
    });
  });

  it('normalizes object route arguments', () => {
    expect(
      normalizeNavigateTarget({ route: 'users.show', params: { id: 1 }, hash: 'profile' }),
    ).toEqual({ route: 'users.show', options: { params: { id: 1 }, hash: 'profile' } });
  });
});
