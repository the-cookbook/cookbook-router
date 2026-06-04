import { createRouteUrlContract as createUrlKitRouteUrlContract } from '@cookbook/urlkit/router-runtime';
import type { StaticHashDescriptor, StaticSearchDescriptor } from '@cookbook/urlkit/static';
import type {
  CreateRouterRouteUrlContractOptions,
  RouterRouteUrlContract,
  RouterRouteUrlDescriptor,
  RouterUrlOptions,
} from './contracts';
import { registerUrlPathConstraints } from './register-url-path-constraints';
import { resolveUrlOptions } from './resolve-url-options';

interface UrlKitStaticRouteDescriptor {
  readonly path?: string;
  readonly search?: StaticSearchDescriptor;
  readonly hash?: StaticHashDescriptor;
}

/**
 * Compiles the URLKit contract for a router route descriptor.
 *
 * Params are compiled in parsed mode so built-in URLKit path constraints such as
 * `{id:int}` and `{value:number}` produce numbers instead of raw strings.
 */
export function createRouteUrlContract(
  route: RouterRouteUrlDescriptor,
  options: CreateRouterRouteUrlContractOptions = {},
): RouterRouteUrlContract {
  registerUrlPathConstraints(options.pathConstraints);

  const urlOptions = resolveUrlOptions({
    ...(options.routerUrl === undefined ? {} : { router: options.routerUrl }),
    ...(route.url === undefined ? {} : { route: route.url }),
    ...(options.callUrl === undefined ? {} : { call: options.callUrl }),
  });
  const descriptor = createUrlKitRouteDescriptor(route);

  return createUrlKitRouteUrlContract(descriptor, {
    params: 'parsed',
    ...toUrlKitContractOptions(urlOptions),
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
  }) as RouterRouteUrlContract;
}

function toUrlKitContractOptions(options: RouterUrlOptions): Pick<RouterUrlOptions, 'arrayFormat'> {
  return {
    ...(options.arrayFormat === undefined ? {} : { arrayFormat: options.arrayFormat }),
  };
}

function createUrlKitRouteDescriptor(route: RouterRouteUrlDescriptor): UrlKitStaticRouteDescriptor {
  return {
    ...(route.path === undefined ? {} : { path: route.path }),
    ...(route.search === undefined ? {} : { search: route.search as StaticSearchDescriptor }),
    ...(route.hash === undefined ? {} : { hash: route.hash as StaticHashDescriptor }),
  };
}
