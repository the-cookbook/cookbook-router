import { createHydrationMismatchError } from '../diagnostics/router-errors';
import type { RouterLocation, RouterHistory } from '../history/memory-history';
import { isHydrationPathSearchMatch } from './hydration';
import type { RouterState, SerializedRouterState } from './contracts';
import type { RouterStateStore } from './router-state-store';

export interface InitializeRouterHydrationOptions {
  readonly hydrationData?: SerializedRouterState;
  readonly history: RouterHistory;
  readonly store: RouterStateStore;
  readonly createState: (
    location: RouterLocation,
    navigation: SerializedRouterState['navigation'],
    error?: unknown,
  ) => RouterState;
}

export function initializeRouterHydration(options: InitializeRouterHydrationOptions): void {
  const { hydrationData } = options;

  if (!hydrationData) {
    return;
  }

  const historyLocation = options.history.location;
  const hydrationError = isHydrationPathSearchMatch(hydrationData.location, historyLocation)
    ? undefined
    : createHydrationMismatchError(hydrationData.location.href, historyLocation.href);

  options.store.setState(
    options.createState(hydrationData.location, hydrationData.navigation, hydrationError),
  );

  if (hydrationError !== undefined || hydrationData.location.hash === historyLocation.hash) {
    return;
  }

  // Hash fragments are not sent to servers, so browser SSR entries can legitimately
  // have a client-only hash difference. Keep the serialized server location as the
  // initial state so framework hydration can match the server HTML exactly. Framework
  // adapters should resolve the current history location after hydration commits.
}
