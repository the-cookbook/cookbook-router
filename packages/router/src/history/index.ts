export type { BrowserHistoryOptions } from './browser-history';
export { createBrowserHistory } from './browser-history';
export type {
  HistoryAction,
  HistoryEvent,
  MemoryHistoryOptions,
  RouterHistory,
  RouterLocation,
} from './memory-history';
export { createMemoryHistory, parseHref } from './memory-history';
export type { StaticHistoryOptions } from './static-history';
export { createStaticHistory } from './static-history';
