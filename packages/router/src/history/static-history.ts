import { parseHref, type RouterHistory } from './memory-history';

export interface StaticHistoryOptions {
  readonly url: string;
}

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
