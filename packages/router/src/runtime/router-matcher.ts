import { parseHref } from '../history/memory-history';
import { matchLocationResult, type MatchLocationResult } from '../matching/match-location';
import type { RouterPathConstraints, RouterPathOptions } from '../path';
import type { NormalizedRoute, RouteMatch } from '../route-config/contracts';
import type { RouterUrlOptions } from '../url-state';

export interface RouterMatcherOptions {
  readonly routes: readonly NormalizedRoute[];
  readonly basename?: string;
  readonly pathOptions: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routerUrl?: RouterUrlOptions;
}

export interface RouterMatcher {
  readonly matchHref: (href: string, callUrl?: RouterUrlOptions) => RouteMatch | null;
  readonly matchHrefResult: (href: string, callUrl?: RouterUrlOptions) => MatchLocationResult;
}

export function createRouterMatcher(options: RouterMatcherOptions): RouterMatcher {
  function matchHrefResult(href: string, callUrl?: RouterUrlOptions): MatchLocationResult {
    return matchLocationResult({
      routes: options.routes,
      location: parseHref(href),
      ...(options.basename === undefined ? {} : { basename: options.basename }),
      pathOptions: options.pathOptions,
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(callUrl === undefined ? {} : { callUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    });
  }

  return {
    matchHref(href, callUrl) {
      const result = matchHrefResult(href, callUrl);

      if (result.status === 'no-match') {
        return null;
      }

      return result.match;
    },
    matchHrefResult,
  };
}
