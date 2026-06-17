import { describe, expect, it } from 'vitest';
import * as history from './index';

describe('history public module', () => {
  it('re-exports browser, memory, and static history adapters', () => {
    expect(history).toMatchObject({
      createBrowserHistory: expect.any(Function),
      createMemoryHistory: expect.any(Function),
      createStaticHistory: expect.any(Function),
      parseHref: expect.any(Function),
    });
  });

  it('exposes parseHref for all pathname, search, hash, state, and key variants', () => {
    expect(
      history.parseHref('/users/1?tab=settings#bio', { key: 'test', state: { from: 'x' } }),
    ).toEqual({
      pathname: '/users/1',
      search: '?tab=settings',
      hash: '#bio',
      href: '/users/1?tab=settings#bio',
      key: 'test',
      state: { from: 'x' },
    });
  });
});
