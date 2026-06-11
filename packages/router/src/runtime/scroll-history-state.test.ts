import { describe, expect, it } from 'vitest';
import { createScrollHistoryState } from './scroll-history-state';

describe('createScrollHistoryState', () => {
  it('returns the original state when scroll reset is not prevented', () => {
    const state = { existing: true };
    expect(createScrollHistoryState(state, false)).toBe(state);
  });

  it('adds the router scroll marker while preserving object state', () => {
    expect(createScrollHistoryState({ existing: true }, true)).toEqual({
      existing: true,
      __cookbookRouterScroll: { preventReset: true },
    });
  });
});
