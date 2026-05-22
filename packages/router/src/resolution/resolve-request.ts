import { matchRoutes } from '../matching/match-routes';
import { resolveSafeStaticUrl } from '../security/ssr-request';
import type { NormalizedRoute, RouteMatch } from '../routes/contracts';

export interface ResolveRequestOptions {
  readonly routes: readonly NormalizedRoute[];
  readonly url: string;
}

export interface ResolvedRequest {
  readonly url: URL;
  readonly match: RouteMatch | null;
}

export function resolveRequest(options: ResolveRequestOptions): ResolvedRequest {
  const url = new URL(resolveSafeStaticUrl(options.url), 'http://localhost');

  return {
    url,
    match: matchRoutes(options.routes, url.pathname),
  };
}
