import { createDefaultHistory } from './default-history';
import { createRouterRuntime } from './create-router-runtime';
import type { CreateRouterOptions, Router } from './contracts';

export type {
  CreateRouterOptions,
  HrefOptions,
  MatchOptions,
  NavigateOptions,
  Router,
  RouterBlocker,
  RouterBlockerContext,
  RouterState,
  SerializedRouterState,
} from './contracts';

/**
 * Creates a browser router by default, or uses the supplied history implementation.
 *
 * Use this in browser applications. For tests and SSR prefer the dedicated
 * memory/static helpers.
 */
export function createRouter(options: CreateRouterOptions): Router {
  const history = options.history ?? createDefaultHistory(options.hydrationData?.location.href);
  return createRouterRuntime({ ...options, history });
}

export {
  deserializeRouterState,
  serializeRouterState,
  stringifyRouterState,
} from './serialize-router-state';
