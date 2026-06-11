import { describe, expect, it } from 'vitest';
import type { SerializedRouterState } from './create-router';
import {
  deserializeRouterState,
  serializeRouterState,
  stringifyRouterState,
} from './serialize-router-state';

const state: SerializedRouterState = {
  location: {
    pathname: '/users/1',
    search: '?tab=profile',
    hash: '#bio',
    href: '/users/1?tab=profile#bio',
    key: 'test-key',
    state: { nested: true },
  },
  navigation: 'idle',
};

describe('serialize-router-state helpers', () => {
  it('serializes, stringifies, and deserializes validated router state', () => {
    const router = { serialize: () => state };

    expect(serializeRouterState(router)).toEqual(state);
    expect(deserializeRouterState(serializeRouterState(router))).toEqual(state);
    expect(deserializeRouterState(stringifyRouterState(router))).toEqual(state);
  });

  it('rejects invalid serialized state', () => {
    expect(() => deserializeRouterState('{"navigation":"idle"}')).toThrow(/invalid location/);
  });
});
