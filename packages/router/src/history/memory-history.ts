export type HistoryAction = 'push' | 'replace' | 'pop' | 'hash';

export interface RouterLocation {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly href: string;
  readonly state?: unknown;
  readonly key: string;
}

export interface HistoryEvent {
  readonly action: HistoryAction;
  readonly location: RouterLocation;
}

export interface RouterHistory {
  readonly location: RouterLocation;
  readonly mode?: 'browser' | 'memory' | 'static';
  redirectExternal?: (href: string, mode: 'push' | 'replace') => void;
  push: (href: string, state?: unknown) => void;
  replace: (href: string, state?: unknown) => void;
  back: () => void;
  forward: () => void;
  go: (delta: number) => void;
  listen: (listener: (event: HistoryEvent) => void) => () => void;
}

export interface MemoryHistoryOptions {
  readonly initialEntries?: readonly string[];
  readonly initialIndex?: number;
}

export function createMemoryHistory(options: MemoryHistoryOptions = {}): RouterHistory {
  const entries = (options.initialEntries?.length ? options.initialEntries : ['/']).map(
    (entry, index) => parseHref(entry, { key: `memory-${index}` }),
  );
  let index = clampIndex(options.initialIndex ?? entries.length - 1, entries);
  const listeners = new Set<(event: HistoryEvent) => void>();

  const history: RouterHistory = {
    mode: 'memory',
    get location() {
      return entries[index] ?? parseHref('/');
    },
    push(href, state) {
      const location = parseHref(href, { state });
      entries.splice(index + 1, entries.length - index - 1, location);
      index = entries.length - 1;
      emit(listeners, { action: 'push', location });
    },
    replace(href, state) {
      const previous = entries[index];
      const location = parseHref(href, createParseOptions(state, previous?.key));
      entries[index] = location;
      emit(listeners, { action: 'replace', location });
    },
    back() {
      history.go(-1);
    },
    forward() {
      history.go(1);
    },
    go(delta) {
      const nextIndex = clampIndex(index + delta, entries);

      if (nextIndex === index) {
        return;
      }

      index = nextIndex;
      emit(listeners, { action: 'pop', location: history.location });
    },
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return history;
}

export function parseHref(
  href: string,
  options: { readonly state?: unknown; readonly key?: string } = {},
): RouterLocation {
  const url = new URL(href || '/', 'http://cookbook-router.local');
  const pathname = url.pathname || '/';
  const search = url.search;
  const hash = url.hash;
  const location: RouterLocation = {
    pathname,
    search,
    hash,
    href: `${pathname}${search}${hash}`,
    key: options.key ?? createLocationKey(),
  };

  if (options.state !== undefined) {
    return { ...location, state: options.state };
  }

  return location;
}

let keyCounter = 0;

function createLocationKey(): string {
  keyCounter += 1;
  return `location-${keyCounter}`;
}

function clampIndex(index: number, entries: readonly RouterLocation[]): number {
  return Math.max(0, Math.min(index, entries.length - 1));
}

function emit(listeners: ReadonlySet<(event: HistoryEvent) => void>, event: HistoryEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

function createParseOptions(
  state: unknown,
  key?: string,
): { readonly state?: unknown; readonly key?: string } {
  return { ...(state === undefined ? {} : { state }), ...(key === undefined ? {} : { key }) };
}
