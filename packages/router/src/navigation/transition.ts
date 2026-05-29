import { runAfterNavigate, runBeforeNavigate, runNavigationError } from './run-lifecycle';
import { runMiddleware } from './run-middleware';
import type { RouterLocation } from '../history/memory-history';
import type { GlobalLifecycle, Middleware, RouteMatch } from '../routes/contracts';

export type RouterNavigationState = 'idle' | 'pending' | 'redirecting' | 'blocked' | 'error';

export interface TransitionOptions {
  readonly from: RouteMatch | null;
  readonly to: RouteMatch | null;
  readonly location: RouterLocation;
  readonly middleware?: readonly Middleware[];
  readonly lifecycle?: GlobalLifecycle;
}

export interface TransitionCommitResult {
  readonly type: 'commit';
}

export interface TransitionBlockedResult {
  readonly type: 'blocked';
}

export interface TransitionRedirectResult {
  readonly type: 'redirect';
  readonly to: string;
}

export interface TransitionRewriteResult {
  readonly type: 'rewrite';
  readonly to: string;
}

export interface TransitionErrorResult {
  readonly type: 'error';
  readonly error: unknown;
}

export type TransitionResult =
  | TransitionCommitResult
  | TransitionBlockedResult
  | TransitionRedirectResult
  | TransitionRewriteResult
  | TransitionErrorResult
  | Response;

export async function runTransition(options: TransitionOptions): Promise<TransitionResult> {
  if (!options.to) {
    return { type: 'commit' };
  }

  try {
    const canNavigate = await runBeforeNavigate(options);

    if (!canNavigate) {
      return { type: 'blocked' };
    }

    const middlewareResult = await runMiddleware({
      ...(options.middleware === undefined ? {} : { middleware: options.middleware }),
      match: options.to,
      location: options.location,
    });

    if (middlewareResult instanceof Response) {
      return middlewareResult;
    }

    if (middlewareResult?.type === 'cancel') {
      return { type: 'blocked' };
    }

    if (middlewareResult?.type === 'redirect' || middlewareResult?.type === 'rewrite') {
      return middlewareResult;
    }

    return { type: 'commit' };
  } catch (error) {
    await runNavigationError(error, options);
    return { type: 'error', error };
  }
}

export async function completeTransition(options: TransitionOptions): Promise<void> {
  try {
    await runAfterNavigate(options);
  } catch (error) {
    await runNavigationError(error, options);
    throw error;
  }
}
