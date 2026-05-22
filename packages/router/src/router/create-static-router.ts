import { createStaticHistory } from '../history/static-history';
import { resolveSafeStaticUrl } from '../security/ssr-request';
import { createRouterRuntime, type CreateRouterOptions, type Router } from './create-router';

export type StaticRouterUrl = string | URL | Request;

export interface CreateStaticRouterOptions extends Omit<CreateRouterOptions, 'history'> {
  readonly url?: StaticRouterUrl;
  readonly request?: Request;
}

export function createStaticRouter(options: CreateStaticRouterOptions): Router {
  return createRouterRuntime({
    ...options,
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
