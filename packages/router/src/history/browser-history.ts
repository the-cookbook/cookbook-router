import {
  parseHref,
  type HistoryEvent,
  type RouterHistory,
  type RouterLocation,
} from './memory-history';

/** Options for the browser history adapter. */
export interface BrowserHistoryOptions {
  readonly window?: Pick<
    Window,
    'location' | 'history' | 'addEventListener' | 'removeEventListener'
  >;
}

/**
 * Creates a DOM-backed history adapter using `window.history`.
 *
 * Modifier-key navigation and external redirects remain browser-native; internal
 * pushes/replaces notify router subscribers with parsed locations.
 */
export function createBrowserHistory(options: BrowserHistoryOptions = {}): RouterHistory {
  const browserWindow = options.window ?? globalThis.window;

  if (!browserWindow) {
    return createUnavailableBrowserHistory();
  }

  const listeners = new Set<(event: HistoryEvent) => void>();

  const readLocation = (): RouterLocation => {
    const state = browserWindow.history.state as {
      readonly cookbookRouterKey?: string;
      readonly state?: unknown;
    } | null;
    return parseHref(
      `${browserWindow.location.pathname}${browserWindow.location.search}${browserWindow.location.hash}`,
      createParseOptions(state?.state, state?.cookbookRouterKey),
    );
  };

  const notify = (event: HistoryEvent): void => {
    for (const listener of listeners) {
      listener(event);
    }
  };

  const onPopState = (): void => notify({ action: 'pop', location: readLocation() });
  const onHashChange = (): void => notify({ action: 'hash', location: readLocation() });

  browserWindow.addEventListener('popstate', onPopState);
  browserWindow.addEventListener('hashchange', onHashChange);

  return {
    mode: 'browser' as const,
    get location() {
      return readLocation();
    },
    push(href, state) {
      const location = parseHref(href, { state });
      browserWindow.history.pushState(
        { cookbookRouterKey: location.key, state },
        '',
        location.href,
      );
      notify({ action: 'push', location: readLocation() });
    },
    redirectExternal(href, mode) {
      if (mode === 'replace') {
        browserWindow.location.replace(href);
        return;
      }

      browserWindow.location.assign(href);
    },
    replace(href, state) {
      const previous = readLocation();
      const location = parseHref(href, { key: previous.key, state });
      browserWindow.history.replaceState(
        { cookbookRouterKey: location.key, state },
        '',
        location.href,
      );
      notify({ action: 'replace', location: readLocation() });
    },
    back() {
      browserWindow.history.back();
    },
    forward() {
      browserWindow.history.forward();
    },
    go(delta) {
      browserWindow.history.go(delta);
    },
    listen(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);

        if (!listeners.size) {
          browserWindow.removeEventListener('popstate', onPopState);
          browserWindow.removeEventListener('hashchange', onHashChange);
        }
      };
    },
  };
}

function createUnavailableBrowserHistory(): RouterHistory {
  throw new Error(
    'Browser history requires a window-like environment. Use createMemoryRouter or createStaticRouter outside the browser.',
  );
}

function createParseOptions(
  state: unknown,
  key?: string,
): { readonly state?: unknown; readonly key?: string } {
  return { ...(state === undefined ? {} : { state }), ...(key === undefined ? {} : { key }) };
}
