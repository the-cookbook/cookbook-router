import type { RouterLocation } from '../history/memory-history';
import { matchRouteCandidates } from '../matching/match-routes';
import type { RouterPathConstraints, RouterPathOptions } from '../path';
import type { NormalizedRoute, RouteMatch, RouteSearchSchema } from '../route-config/contracts';
import {
  parseRouteHash,
  parseRouteSearchState,
  resolveRouteUrlOptions,
} from '../url-state/route-url-state';
import type { RouterUrlOptions } from '../url-state';
import { stripBasename } from '../runtime/pathname';

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
  let unknownSearch: unknown;

  try {
    const searchState = parseRouteSearchState(
      match.route,
      match.pathname,
      options.location.search,
      options,
    );
    search = searchState.search;
    unknownSearch = searchState.unknownSearch;
  } catch (error) {
    const urlOptions = resolveRouteUrlOptions(match.route, options);
    const policy = urlOptions.invalidSearch ?? 'recover';

    if (
      urlOptions.unknownSearch === 'error' &&
      isUnknownSearchError(error, match.route.route.search)
    ) {
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
        ...(unknownSearch === undefined ? {} : { unknownSearch: unknownSearch as never }),
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
        ...(unknownSearch === undefined ? {} : { unknownSearch: unknownSearch as never }),
        hash: undefined as never,
        href: options.location.href,
      },
    };
  }
}

function isUnknownSearchError(error: unknown, schema: RouteSearchSchema | undefined): boolean {
  if (
    !error ||
    typeof error !== 'object' ||
    !('code' in error) ||
    error.code !== 'invalid-search'
  ) {
    return false;
  }

  if (!('path' in error) || !Array.isArray(error.path)) {
    return false;
  }

  const [pathHead] = error.path;

  return typeof pathHead === 'string' && !(pathHead in (schema ?? {}));
}
