import { createBrowserHistory } from '../history/browser-history';
import { createMemoryHistory, type RouterHistory } from '../history/memory-history';

export function createDefaultHistory(initialHref?: string): RouterHistory {
  if (typeof globalThis.window === 'undefined') {
    return createMemoryHistory({ initialEntries: [initialHref ?? '/'] });
  }

  return createBrowserHistory();
}
