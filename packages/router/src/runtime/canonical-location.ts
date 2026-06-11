import { parseHref, type RouterLocation } from '../history/memory-history';
import type { MatchLocationResult } from '../matching/match-location';
import { prunePathname, type RouterPathConstraints, type RouterPathOptions } from '../path';
import type { RouteMatch } from '../route-config/contracts';
import { buildRoutePath, type RouterUrlOptions } from '../url-state';
import { applyBasename } from './pathname';

export interface CanonicalizeLocationOptions {
  readonly location: RouterLocation;
  readonly callUrl?: RouterUrlOptions;
  readonly basename?: string;
  readonly historyMode?: 'browser' | 'memory' | 'static';
  readonly pathOptions: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routerUrl?: RouterUrlOptions;
  readonly matchHrefResult: (href: string, callUrl?: RouterUrlOptions) => MatchLocationResult;
}

export interface CanonicalizedLocation {
  readonly location: RouterLocation;
  readonly match: RouteMatch | null;
  readonly replaced: boolean;
  readonly error?: unknown;
}

export function canonicalizeLocation(options: CanonicalizeLocationOptions): CanonicalizedLocation {
  let nextLocation = options.location;
  let nextMatchResult = options.matchHrefResult(nextLocation.href, options.callUrl);
  let nextMatch = nextMatchResult.status === 'no-match' ? null : nextMatchResult.match;

  if (!nextMatch) {
    const prunedPathname = prunePathname(nextLocation.pathname, options.pathOptions);

    if (prunedPathname !== nextLocation.pathname) {
      const candidate = parseHref(`${prunedPathname}${nextLocation.search}${nextLocation.hash}`, {
        ...(nextLocation.state === undefined ? {} : { state: nextLocation.state }),
        key: nextLocation.key,
      });
      const candidateMatchResult = options.matchHrefResult(candidate.href, options.callUrl);
      const candidateMatch =
        candidateMatchResult.status === 'no-match' ? null : candidateMatchResult.match;

      if (candidateMatch) {
        nextLocation = candidate;
        nextMatchResult = candidateMatchResult;
        nextMatch = candidateMatch;
      }
    }
  }

  if (!nextMatch) {
    return { location: nextLocation, match: nextMatch, replaced: false };
  }

  if (nextMatchResult.status === 'error') {
    return {
      location: nextLocation,
      match: nextMatch,
      replaced: false,
      error: nextMatchResult.error,
    };
  }

  const canonicalPathname = applyBasename(
    buildRoutePath(nextMatch.route, nextMatch.params, {
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    }),
    options.basename,
  );
  const canonicalHref = `${canonicalPathname}${nextLocation.search}${nextLocation.hash}`;

  if (canonicalHref === nextLocation.href) {
    return { location: nextLocation, match: nextMatch, replaced: false };
  }

  const canonicalLocation = parseHref(canonicalHref, {
    ...(nextLocation.state === undefined ? {} : { state: nextLocation.state }),
    key: nextLocation.key,
  });

  const canonicalMatchResult = options.matchHrefResult(canonicalLocation.href, options.callUrl);

  return {
    location: canonicalLocation,
    match: canonicalMatchResult.status === 'no-match' ? null : canonicalMatchResult.match,
    replaced: options.historyMode !== 'static',
    ...(canonicalMatchResult.status === 'error' ? { error: canonicalMatchResult.error } : {}),
  };
}
