import type { RouterState } from './contracts';

export interface RouterStateStore {
  readonly getState: () => RouterState;
  readonly setState: (nextState: RouterState) => RouterState;
  readonly subscribe: (listener: (state: RouterState) => void) => () => void;
  readonly clearListeners: () => void;
}

export function createRouterStateStore(initialState: RouterState): RouterStateStore {
  let state = initialState;
  const listeners = new Set<(state: RouterState) => void>();

  return {
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;

      for (const listener of listeners) {
        listener(state);
      }

      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clearListeners() {
      listeners.clear();
    },
  };
}
