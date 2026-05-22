import { createMemoryHistory, type MemoryHistoryOptions } from '../history/memory-history';
import { createRouterRuntime, type CreateRouterOptions, type Router } from './create-router';

export interface CreateMemoryRouterOptions
  extends Omit<CreateRouterOptions, 'history'>, MemoryHistoryOptions {}

export function createMemoryRouter(options: CreateMemoryRouterOptions): Router {
  return createRouterRuntime({
    ...options,
    history: createMemoryHistory({
      initialEntries: options.hydrationData
        ? [options.hydrationData.location.href]
        : (options.initialEntries ?? ['/']),
      ...(options.hydrationData || options.initialIndex === undefined
        ? {}
        : { initialIndex: options.initialIndex }),
    }),
  });
}
