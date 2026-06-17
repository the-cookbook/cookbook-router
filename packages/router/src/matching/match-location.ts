import type { RouterLocation } from '../history/memory-history';
import {
  createRouteUrlStateOptions,
  matchRoutePathCandidates,
  resolveRouteUrlContractStore,
  type MatchRoutesOptions,
  type RoutePathCandidate,
} from './match-routes';
import type { RouterPathConstraints } from '../path/constraints';
import type { RouterPathOptions } from '../path/options';
import type { NormalizedRoute, RouteMatch, RouteSearchSchema } from '../route-config/contracts';
import { resolveSlots } from '../rendering/resolve-slots';
import { stripBasename } from '../runtime/pathname';
import {
  parseRouteHash,
  parseRouteSearchState,
  resolveRouteUrlOptions,
  type RouteUrlStateOptions,
} from '../url-state/route-url-state';
import type { RouterUrlOptions } from '../url-state/contracts';
import type { RouteUrlContractStore } from '../url-state/route-url-contract-store';

export interface MatchLocationOptions {
  readonly routes: readonly NormalizedRoute[];
  readonly location: RouterLocation;
  readonly basename?: string;
  readonly pathOptions?: RouterPathOptions;
  readonly routerUrl?: RouterUrlOptions;
  readonly callUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routeUrlContracts?: RouteUrlContractStore;
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
  const matchOptions = toMatchRoutesOptions(options);
  const routeUrlContracts = resolveRouteUrlContractStore(matchOptions);
  const routeUrlStateOptions = createRouteUrlStateOptions(matchOptions, routeUrlContracts);
  const candidates = matchRoutePathCandidates(
    options.routes,
    pathname,
    matchOptions,
    routeUrlContracts,
  );

  for (const candidate of candidates) {
    const result = parseCandidateUrlState(candidate, options, routeUrlStateOptions);

    if (result.status === 'no-match') {
      continue;
    }

    return result;
  }

  return { status: 'no-match' };
}

function toMatchRoutesOptions(options: MatchLocationOptions): MatchRoutesOptions {
  const matchOptions: {
    routerUrl?: RouterUrlOptions;
    callUrl?: RouterUrlOptions;
    pathConstraints?: RouterPathConstraints;
    routeUrlContracts?: RouteUrlContractStore;
  } = {};

  if (options.routerUrl !== undefined) {
    matchOptions.routerUrl = options.routerUrl;
  }

  if (options.callUrl !== undefined) {
    matchOptions.callUrl = options.callUrl;
  }

  if (options.pathConstraints !== undefined) {
    matchOptions.pathConstraints = options.pathConstraints;
  }

  if (options.routeUrlContracts !== undefined) {
    matchOptions.routeUrlContracts = options.routeUrlContracts;
  }

  return matchOptions;
}

function parseCandidateUrlState(
  candidate: RoutePathCandidate,
  options: MatchLocationOptions,
  routeUrlStateOptions: RouteUrlStateOptions,
): MatchLocationResult {
  let search: unknown;
  let unknownSearch: unknown;

  try {
    const searchState = parseRouteSearchState(
      candidate.route,
      candidate.pathname,
      options.location.search,
      routeUrlStateOptions,
    );
    search = searchState.search;
    unknownSearch = searchState.unknownSearch;
  } catch (error) {
    const urlOptions = resolveRouteUrlOptions(candidate.route, routeUrlStateOptions);
    const policy = urlOptions.invalidSearch ?? 'recover';

    if (
      urlOptions.unknownSearch === 'error' &&
      isUnknownSearchError(error, candidate.route.route.search)
    ) {
      return {
        status: 'error',
        error,
        match: createRouteMatch(candidate, options, routeUrlStateOptions, {
          search: {} as never,
          hash: undefined as never,
        }),
      };
    }

    if (policy === 'no-match') {
      return { status: 'no-match' };
    }

    return {
      status: 'error',
      error,
      match: createRouteMatch(candidate, options, routeUrlStateOptions, {
        search: {} as never,
        hash: undefined as never,
      }),
    };
  }

  try {
    return {
      status: 'matched',
      match: createRouteMatch(candidate, options, routeUrlStateOptions, {
        search: search as never,
        unknownSearch,
        hash: parseRouteHash(candidate.route, options.location.hash, routeUrlStateOptions) as never,
      }),
    };
  } catch (error) {
    const policy =
      resolveRouteUrlOptions(candidate.route, routeUrlStateOptions).invalidHash ?? 'recover';

    if (policy === 'no-match') {
      return { status: 'no-match' };
    }

    return {
      status: 'error',
      error,
      match: createRouteMatch(candidate, options, routeUrlStateOptions, {
        search: search as never,
        unknownSearch,
        hash: undefined as never,
      }),
    };
  }
}

function createRouteMatch(
  candidate: RoutePathCandidate,
  options: MatchLocationOptions,
  routeUrlStateOptions: RouteUrlStateOptions,
  state: {
    readonly search: never;
    readonly unknownSearch?: unknown;
    readonly hash: never;
  },
): RouteMatch {
  return {
    ...candidate,
    search: state.search,
    ...(state.unknownSearch === undefined ? {} : { unknownSearch: state.unknownSearch as never }),
    hash: state.hash,
    href: options.location.href,
    slots: resolveSlots(
      candidate.branch,
      candidate.pathname,
      options.pathOptions,
      routeUrlStateOptions,
    ),
  };
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
