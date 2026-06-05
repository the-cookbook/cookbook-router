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

export interface MiddlewareRewriteResult {
  readonly type: 'rewrite';
  readonly to: string;
}

export interface MiddlewareCancelResult {
  readonly type: 'cancel';
}

export type RunMiddlewareResult =
  | undefined
  | MiddlewareRedirectResult
  | MiddlewareRewriteResult
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
      search: options.match.search as never,
      ...(options.match.unknownSearch === undefined
        ? {}
        : { unknownSearch: options.match.unknownSearch }),
      hash: options.match.hash,
      redirect: (to) => normalizeMiddlewareTarget(to, 'redirect'),
      rewrite: (to) => normalizeMiddlewareTarget(to, 'rewrite'),
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

function normalizeMiddlewareTarget<T extends 'redirect' | 'rewrite'>(
  to: string,
  type: T,
): T extends 'redirect' ? MiddlewareRedirectResult : MiddlewareRewriteResult {
  if (!to || typeof to !== 'string') {
    throw createMalformedRedirectError(to);
  }

  return { type, to } as T extends 'redirect' ? MiddlewareRedirectResult : MiddlewareRewriteResult;
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

  if (result.type === 'redirect' || result.type === 'rewrite') {
    if (!result.to) {
      throw createMalformedRedirectError(result.to);
    }

    return result;
  }

  if (result.type === 'cancel') {
    return result;
  }
}
