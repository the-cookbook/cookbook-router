import { parseHref, type RouterLocation } from '../history/memory-history';
import type {
  MatchedRoute,
  RouteMatch,
  RoutePreloadContext,
  RouteView,
} from '../route-config/contracts';

export interface RunRoutePreloadOptions {
  readonly match: RouteMatch;
  readonly signal?: AbortSignal;
}

interface PreloadableRouteView {
  readonly preload?: () => void | Promise<void>;
}

/** Runs module, lazy-view, and authored route preload hooks for a matched branch. */
export async function runRoutePreload(options: RunRoutePreloadOptions): Promise<void> {
  const location = parseHref(options.match.href);

  for (const route of options.match.branch) {
    throwIfAborted(options.signal);
    const modulePreload = maybeRunPreload(route.route.route.modulePreload, options.signal);
    if (isPromiseLike(modulePreload)) {
      await modulePreload;
    }

    throwIfAborted(options.signal);
    const layoutViewPreload = maybeRunViewPreload(route.route.layout?.view, options.signal);
    if (isPromiseLike(layoutViewPreload)) {
      await layoutViewPreload;
    }

    throwIfAborted(options.signal);
    const routeViewPreload = maybeRunViewPreload(route.route.view, options.signal);
    if (isPromiseLike(routeViewPreload)) {
      await routeViewPreload;
    }
    throwIfAborted(options.signal);

    if (route.route.route.preload) {
      await route.route.route.preload(
        createRoutePreloadContext(route, options.match, location, options.signal),
      );
    }
  }
}

function createRoutePreloadContext(
  route: MatchedRoute,
  match: RouteMatch,
  location: RouterLocation,
  signal?: AbortSignal,
): RoutePreloadContext {
  return {
    route,
    match,
    location,
    params: route.params,
    search: match.search,
    ...(match.unknownSearch === undefined ? {} : { unknownSearch: match.unknownSearch }),
    hash: match.hash,
    signal: signal ?? createNeverAbortedSignal(),
  };
}

function maybeRunPreload(
  preload: (() => void | Promise<void>) | undefined,
  signal: AbortSignal | undefined,
): void | Promise<void> {
  if (!preload) {
    return;
  }

  throwIfAborted(signal);
  return preload();
}

function maybeRunViewPreload(
  view: RouteView | undefined,
  signal?: AbortSignal,
): void | Promise<void> {
  const preload = getRouteViewPreload(view);
  return maybeRunPreload(preload, signal);
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
  return !!value && typeof value.then === 'function';
}

function getRouteViewPreload(
  view: RouteView | undefined,
): (() => void | Promise<void>) | undefined {
  if (!view || (typeof view !== 'object' && typeof view !== 'function')) {
    return undefined;
  }

  const preload = (view as PreloadableRouteView).preload;
  return typeof preload === 'function' ? () => preload.call(view) : undefined;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted !== true) {
    return;
  }

  throw createAbortError();
}

function createAbortError(): Error | DOMException {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('The route preload was aborted.', 'AbortError');
  }

  const error = new Error('The route preload was aborted.');
  error.name = 'AbortError';
  return error;
}

let neverAbortedController: AbortController | undefined;

function createNeverAbortedSignal(): AbortSignal {
  neverAbortedController ??= new AbortController();
  return neverAbortedController.signal;
}
