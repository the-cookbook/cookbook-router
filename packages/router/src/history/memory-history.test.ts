import { describe, expect, test } from 'vitest';
import { createMemoryHistory, parseHref } from './memory-history';

describe('memory-history', () => {
  test('parses pathname, search, hash, state, and stable key', () => {
    expect(parseHref('/users/1?tab=settings#profile', { key: 'k', state: { ok: true } })).toEqual({
      pathname: '/users/1',
      search: '?tab=settings',
      hash: '#profile',
      href: '/users/1?tab=settings#profile',
      key: 'k',
      state: { ok: true },
    });
  });

  test('pushes, replaces, walks entries, clamps movement, and unsubscribes', () => {
    const history = createMemoryHistory({ initialEntries: ['/one', '/two'], initialIndex: 9 });
    const events: string[] = [];
    const unsubscribe = history.listen((event) =>
      events.push(`${event.action}:${event.location.href}`),
    );

    expect(history.location.href).toBe('/two');
    history.push('/three#hash');
    expect(history.location.href).toBe('/three#hash');
    history.replace('/three?x=1');
    expect(history.location.search).toBe('?x=1');
    history.back();
    expect(history.location.href).toBe('/two');
    history.forward();
    expect(history.location.href).toBe('/three?x=1');
    history.go(-50);
    expect(history.location.href).toBe('/one');
    history.go(0);
    unsubscribe();
    history.push('/ignored');

    expect(events).toEqual([
      'push:/three#hash',
      'replace:/three?x=1',
      'pop:/two',
      'pop:/three?x=1',
      'pop:/one',
    ]);
  });

  test('defaults to root when no initial entries are provided', () => {
    expect(createMemoryHistory().location.href).toBe('/');
  });
});
