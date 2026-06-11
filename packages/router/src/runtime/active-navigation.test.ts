import { describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import { createActiveNavigationTracker } from './active-navigation';
import type { RouterState } from './contracts';

function createState(href: string): RouterState {
  return {
    location: parseHref(href),
    match: null,
    navigation: 'idle',
  };
}

describe('createActiveNavigationTracker', () => {
  it('deduplicates an identical active navigation', () => {
    const tracker = createActiveNavigationTracker();
    const request = { href: '/users', mode: 'push' as const };
    const promise = Promise.resolve(createState('/users'));

    tracker.start(request, promise);

    expect(tracker.getMatching(request)).toBe(promise);
  });

  it('does not deduplicate different navigation requests', () => {
    const tracker = createActiveNavigationTracker();
    const promise = Promise.resolve(createState('/users'));

    tracker.start({ href: '/users', mode: 'push' }, promise);

    expect(tracker.getMatching({ href: '/users', mode: 'replace' })).toBeUndefined();
    expect(tracker.getMatching({ href: '/settings', mode: 'push' })).toBeUndefined();
  });
});
