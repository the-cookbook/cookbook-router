import { describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import { createRouterStateStore } from './router-state-store';
import type { RouterState } from './contracts';

function createState(href: string): RouterState {
  return {
    location: parseHref(href),
    match: null,
    navigation: 'idle',
  };
}

describe('createRouterStateStore', () => {
  it('stores and returns the current router state', () => {
    const initial = createState('/');
    const next = createState('/next');
    const store = createRouterStateStore(initial);

    expect(store.getState()).toBe(initial);
    expect(store.setState(next)).toBe(next);
    expect(store.getState()).toBe(next);
  });

  it('notifies subscribed listeners and supports unsubscribe', () => {
    const store = createRouterStateStore(createState('/'));
    const observed: string[] = [];
    const unsubscribe = store.subscribe((state) => observed.push(state.location.href));

    store.setState(createState('/a'));
    unsubscribe();
    store.setState(createState('/b'));

    expect(observed).toEqual(['/a']);
  });
});
