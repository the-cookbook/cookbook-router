import { createStaticHistory } from '../history/static-history';
import { resolveSafeStaticUrl } from '../security/ssr-request';
import { createRouterRuntime } from './create-router-runtime';
import type { CreateRouterOptions, Router } from './contracts';
import type { RouterUrlOptions } from '../url-state/contracts';

export type StaticRouterUrl = string | URL | Request;

export interface CreateStaticRouterOptions extends Omit<CreateRouterOptions, 'history' | 'url'> {
  readonly url?: StaticRouterUrl;
  readonly request?: Request;
  /** Router-level URLKit defaults for static rendering flows. */
  readonly routerUrl?: RouterUrlOptions;
}

export function createStaticRouter(options: CreateStaticRouterOptions): Router {
  const { request: _request, url: _staticUrl, routerUrl, ...routerOptions } = options;

  return createRouterRuntime({
    ...routerOptions,
    ...(routerUrl === undefined ? {} : { url: routerUrl }),
    history: createStaticHistory({ url: resolveStaticUrl(options) }),
  });
}

function resolveStaticUrl(options: CreateStaticRouterOptions): string {
  if (options.request) {
    return resolveSafeStaticUrl(options.request);
  }

  if (options.url !== undefined) {
    return resolveSafeStaticUrl(options.url);
  }

  throw new Error('createStaticRouter requires either url or request.');
}
