import type { GlobalLifecycle, RouteLifecycleContext, RouteMatch } from '../routes/contracts';
import type { RouterLocation } from '../history/memory-history';

export interface RunLifecycleOptions {
  readonly lifecycle?: GlobalLifecycle;
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
}

export async function runBeforeNavigate(options: RunLifecycleOptions): Promise<boolean> {
  const context = createContext(options);
  const result = await options.lifecycle?.beforeNavigate?.(context);

  if (result === false) {
    return false;
  }

  for (const match of [...(options.from?.branch ?? [])].reverse()) {
    const leaveResult = await match.route.route.lifecycle?.beforeLeave?.(context);

    if (leaveResult === false) {
      return false;
    }
  }

  for (const match of options.to?.branch ?? []) {
    const enterResult = await match.route.route.lifecycle?.beforeEnter?.(context);

    if (enterResult === false) {
      return false;
    }
  }

  return true;
}

export async function runAfterNavigate(options: RunLifecycleOptions): Promise<void> {
  const context = createContext(options);

  for (const match of options.to?.branch ?? []) {
    await match.route.route.lifecycle?.afterEnter?.(context);
  }

  await options.lifecycle?.afterNavigate?.(context);
}

export async function runNavigationError(
  error: unknown,
  options: RunLifecycleOptions,
): Promise<void> {
  const context = createContext(options);

  for (const match of options.to?.branch ?? []) {
    await match.route.route.lifecycle?.onError?.(error, context);
  }

  await options.lifecycle?.onNavigationError?.(error, context);
}

function createContext(options: RunLifecycleOptions): RouteLifecycleContext {
  return {
    from: options.from,
    to: options.to,
    location: options.location,
    params: options.to?.params ?? {},
    search: (options.to?.search ?? {}) as never,
    hash: options.to?.hash,
  };
}
