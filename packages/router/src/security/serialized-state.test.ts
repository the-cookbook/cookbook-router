import { describe, expect, test } from 'vitest';
import {
  assertSerializedRouterState,
  parseSerializedRouterState,
  stringifySerializedRouterState,
} from './serialized-state';

describe('serialized router state safety', () => {
  const state = {
    location: {
      pathname: '/users/1',
      search: '?q=script',
      hash: '#top',
      href: '/users/1?q=script#top',
      key: 'server-1',
      state: { html: '</script><script>alert(1)</script>', __proto__: { polluted: true } },
    },
    navigation: 'idle' as const,
  };

  test('escapes strings that would break a hydration script tag', () => {
    const serialized = stringifySerializedRouterState(state);

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
  });

  test('parses and validates serialized state', () => {
    const parsed = parseSerializedRouterState(stringifySerializedRouterState(state));

    expect(parsed.location.href).toBe('/users/1?q=script#top');
    expect(parsed.navigation).toBe('idle');
  });

  test('rejects malformed locations and navigation states', () => {
    expect(() =>
      assertSerializedRouterState({
        location: { pathname: 'javascript:alert(1)' },
        navigation: 'idle',
      }),
    ).toThrow('invalid location');
    expect(() =>
      assertSerializedRouterState({ location: state.location, navigation: 'done' }),
    ).toThrow('invalid navigation state');
    expect(() => parseSerializedRouterState('')).toThrow('non-empty JSON string');
  });
});
