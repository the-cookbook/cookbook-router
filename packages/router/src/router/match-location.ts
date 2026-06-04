import type { RouterLocation } from '../history/memory-history';
import { matchRouteCandidates } from '../matching/match-routes';
import type { RouterPathConstraints, RouterPathOptions } from '../pathkit/pathkit';
import type { NormalizedRoute, RouteMatch } from '../routes/contracts';
import { parseRouteHash, parseRouteSearch, resolveRouteUrlOptions } from '../url/route-url-state';
import type { RouterUrlOptions } from '../url';
import { stripBasename } from './pathname';

export interface MatchLocationOptions {
  readonly routes: readonly NormalizedRoute[];
  readonly location: RouterLocation;
  readonly basename?: string;
  readonly pathOptions?: RouterPathOptions;
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

export type MatchLocationResult =
  | { readonly status: 'matched'; readonly match: RouteMatch }
  | { readonly status: 'no-match' }
  | { readonly status: 'error'; readonly match: RouteMatch; readonly error: unknown };

/** Matches a parsed location and attaches URLKit-parsed search and hash state. */
export function matchLocation(options: MatchLocationOptions): RouteMatch | null {
  const result = matchLocationResult(options);

  if (result.status === 'no-match') {
    return null;
  }

  return result.match;
}

/**
 * Matches a parsed location while preserving the distinction between a route
 * miss and URL-state parse failures that should render route error fallbacks.
 */
export function matchLocationResult(options: MatchLocationOptions): MatchLocationResult {
  const pathname = stripBasename(options.location.pathname, options.basename);
  const candidates = matchRouteCandidates(options.routes, pathname, options.pathOptions, {
    ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
    ...(options.callUrl === undefined ? {} : { callUrl: options.callUrl }),
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
  });

  for (const candidate of candidates) {
    const result = parseCandidateUrlState(candidate, options);

    if (result.status === 'no-match') {
      continue;
    }

    return result;
  }

  return { status: 'no-match' };
}

function parseCandidateUrlState(
  match: RouteMatch,
  options: MatchLocationOptions,
): MatchLocationResult {
  let search: unknown;

  try {
    search = parseRouteSearch(match.route, options.location.search, options);
  } catch (error) {
    const policy = resolveRouteUrlOptions(match.route, options).invalidSearch ?? 'recover';

    if (policy === 'no-match') {
      return { status: 'no-match' };
    }

    return {
      status: 'error',
      error,
      match: {
        ...match,
        search: {} as never,
        hash: undefined as never,
        href: options.location.href,
      },
    };
  }

  try {
    return {
      status: 'matched',
      match: {
        ...match,
        search: search as never,
        hash: parseRouteHash(match.route, options.location.hash, options) as never,
        href: options.location.href,
      },
    };
  } catch (error) {
    const policy = resolveRouteUrlOptions(match.route, options).invalidHash ?? 'recover';

    if (policy === 'no-match') {
      return { status: 'no-match' };
    }

    return {
      status: 'error',
      error,
      match: {
        ...match,
        search: search as never,
        hash: undefined as never,
        href: options.location.href,
      },
    };
  }
}
