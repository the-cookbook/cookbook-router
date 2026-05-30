import { describe, expect, it } from 'vitest';
import { createBrowserHistory } from './browser-history';

interface ListenerMap {
  popstate?: () => void;
  hashchange?: () => void;
}

function createWindowMock() {
  const listeners: ListenerMap = {};
  const location = { pathname: '/', search: '', hash: '' };
  const history = {
    state: null as unknown,
    pushState(state: unknown, _title: string, href: string) {
      this.state = state;
      const url = new URL(href, 'http://cookbook-router.local');
      location.pathname = url.pathname;
      location.search = url.search;
      location.hash = url.hash;
    },
    replaceState(state: unknown, _title: string, href: string) {
      this.state = state;
      const url = new URL(href, 'http://cookbook-router.local');
      location.pathname = url.pathname;
      location.search = url.search;
      location.hash = url.hash;
    },
    back() {},
    forward() {},
    go(_delta: number) {},
  };

  return {
    location,
    history,
    listeners,
    addEventListener(name: keyof ListenerMap, listener: () => void) {
      listeners[name] = listener;
    },
    removeEventListener(name: keyof ListenerMap) {
      delete listeners[name];
    },
  };
}

describe('browser-history', () => {
  it('reads, writes, emits, and cleans up browser events', () => {
    const windowMock = createWindowMock();
    const history = createBrowserHistory({ window: windowMock as unknown as Window });
    const events: string[] = [];
    const unsubscribe = history.listen((event) =>
      events.push(`${event.action}:${event.location.href}`),
    );

    history.push('/users/1#profile', { pushed: true });
    history.replace('/users/1?tab=settings', { replaced: true });
    windowMock.listeners.popstate?.();
    windowMock.listeners.hashchange?.();
    unsubscribe();

    expect(history.location.href).toBe('/users/1?tab=settings');
    expect(events).toEqual([
      'push:/users/1#profile',
      'replace:/users/1?tab=settings',
      'pop:/users/1?tab=settings',
      'hash:/users/1?tab=settings',
    ]);
    expect(windowMock.listeners).toEqual({});
  });

  it('throws without a window-like environment', () => {
    const previousWindow = globalThis.window;

    // @ts-expect-error Vitest node environment may not define window.
    delete globalThis.window;
    expect(() => createBrowserHistory()).toThrow(
      'Browser history requires a window-like environment.',
    );
    globalThis.window = previousWindow;
  });
});
