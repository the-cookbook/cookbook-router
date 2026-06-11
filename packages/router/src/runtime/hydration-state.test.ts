import { describe, expect, it } from 'vitest';
import { parseHref, type RouterHistory } from '../history/memory-history';
import type { RouterState, SerializedRouterState } from './contracts';
import { createRouterStateStore } from './router-state-store';
import { initializeRouterHydration } from './hydration-state';

function createState(
  location = parseHref('/'),
  navigation: SerializedRouterState['navigation'] = 'idle',
  error?: unknown,
): RouterState {
  return {
    location,
    match: null,
    navigation,
    ...(error === undefined ? {} : { error }),
  };
}

function createHistory(location = parseHref('/')): RouterHistory {
  return {
    mode: 'browser',
    location,
    listen() {
      return () => undefined;
    },
    push() {},
    replace() {},
    back() {},
    forward() {},
    go() {},
  };
}

describe('initializeRouterHydration', () => {
  it('does nothing without hydration data', () => {
    const store = createRouterStateStore(createState());

    initializeRouterHydration({
      history: createHistory(parseHref('/current')),
      store,
      createState,
    });

    expect(store.getState().location.href).toBe('/');
  });

  it('hydrates matching pathname and search state', () => {
    const store = createRouterStateStore(createState());

    initializeRouterHydration({
      hydrationData: {
        location: parseHref('/dashboard?tab=home'),
        navigation: 'idle',
      },
      history: createHistory(parseHref('/dashboard?tab=home')),
      store,
      createState,
    });

    expect(store.getState().location.href).toBe('/dashboard?tab=home');
    expect(store.getState().error).toBeUndefined();
  });

  it('stores a hydration mismatch error when pathname or search differs', () => {
    const store = createRouterStateStore(createState());

    initializeRouterHydration({
      hydrationData: {
        location: parseHref('/server'),
        navigation: 'idle',
      },
      history: createHistory(parseHref('/client')),
      store,
      createState,
    });

    expect(store.getState().location.href).toBe('/server');
    expect(store.getState().error).toBeInstanceOf(Error);
  });

  it('keeps the hydrated server hash until an adapter resolves browser state after hydration', () => {
    const store = createRouterStateStore(createState());

    initializeRouterHydration({
      hydrationData: {
        location: parseHref('/dashboard'),
        navigation: 'idle',
      },
      history: createHistory(parseHref('/dashboard#section')),
      store,
      createState,
    });

    expect(store.getState().location.href).toBe('/dashboard');
    expect(store.getState().location.hash).toBe('');
    expect(store.getState().error).toBeUndefined();
  });
});
