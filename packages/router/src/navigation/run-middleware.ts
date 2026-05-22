import { createMalformedRedirectError } from '../diagnostics/router-errors';
import type { Middleware, MiddlewareResult, RouteMatch } from '../routes/contracts';
import type { RouterLocation } from '../history/memory-history';

export interface RunMiddlewareOptions {
  readonly middleware?: readonly Middleware[];
  readonly match: RouteMatch;
  readonly location: RouterLocation;
}

export interface MiddlewareRedirectResult {
  readonly type: 'redirect';
  readonly to: string;
}

export interface MiddlewareCancelResult {
  readonly type: 'cancel';
}

export type RunMiddlewareResult =
  | undefined
  | MiddlewareRedirectResult
  | MiddlewareCancelResult
  | Response;

export async function runMiddleware(options: RunMiddlewareOptions): Promise<RunMiddlewareResult> {
  const route = options.match.branch[options.match.branch.length - 1];

  if (!route) {
    throw new Error('Cannot run middleware without a matched route branch.');
  }

  for (const entry of iterateMiddlewarePipeline(options)) {
    const result = await entry({
      route,
      location: options.location,
      params: options.match.params,
      redirect: (to) => normalizeRedirectTarget(to),
      cancel: () => ({ type: 'cancel' }),
    });

    const normalized = normalizeMiddlewareResult(result);

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function* iterateMiddlewarePipeline(options: RunMiddlewareOptions): Generator<Middleware> {
  for (const middleware of options.middleware ?? []) {
    yield middleware;
  }

  for (const match of options.match.branch) {
    for (const middleware of match.route.route.middleware ?? []) {
      yield middleware;
    }
  }
}

function normalizeRedirectTarget(to: string): MiddlewareRedirectResult {
  if (!to || typeof to !== 'string') {
    throw createMalformedRedirectError(to);
  }

  return { type: 'redirect', to };
}

function normalizeMiddlewareResult(result: MiddlewareResult): RunMiddlewareResult {
  if (result === false) {
    return { type: 'cancel' };
  }

  if (result instanceof Response) {
    return result;
  }

  if (!result) {
    return undefined;
  }

  if (result.type === 'redirect') {
    if (!result.to) {
      throw createMalformedRedirectError(result.to);
    }

    return result;
  }

  if (result.type === 'cancel') {
    return result;
  }
}
