import { parseHref, type RouterHistory } from './memory-history';

/** Options for static, non-mutating history used during SSR/static rendering. */
export interface StaticHistoryOptions {
  readonly url: string;
}

/**
 * Creates a read-only history for SSR/static rendering.
 *
 * Push and replace throw because a static request cannot mutate browser history.
 */
export function createStaticHistory(options: StaticHistoryOptions): RouterHistory {
  const location = parseHref(options.url);

  return {
    mode: 'static' as const,
    location,
    push() {
      throw new Error('Static history cannot push navigation entries.');
    },
    replace() {
      throw new Error('Static history cannot replace navigation entries.');
    },
    back() {},
    forward() {},
    go() {},
    listen() {
      return () => {};
    },
  };
}
