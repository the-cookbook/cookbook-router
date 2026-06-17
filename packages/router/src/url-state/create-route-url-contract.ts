import { createRouteUrlContract as createUrlKitRouteUrlContract } from '@cookbook/urlkit/router-runtime';
import type { StaticHashDescriptor, StaticSearchField } from '@cookbook/urlkit/static';
import type {
  CreateRouterRouteUrlContractOptions,
  RouterRouteUrlContract,
  RouterRouteUrlDescriptor,
} from './contracts';
import { createRouteUrlContractDiagnostic } from './create-route-url-contract-diagnostic';
import { toUrlKitContractOptions } from './map-router-url-options';
import { registerPathConstraints } from '../path/constraints';
import { resolveUrlOptions } from './resolve-url-options';

interface UrlKitStaticRouteDescriptor {
  readonly path?: string;
  readonly search?: Readonly<Record<string, StaticSearchField>>;
  readonly hash?: StaticHashDescriptor;
}

/**
 * Compiles the URLKit contract for a router route descriptor.
 *
 * Router route definitions consume the same cleaned static descriptor shape as
 * URLKit v2. Search and hash descriptors are forwarded without compatibility
 * conversion so URLKit remains the single source of validation, parsing,
 * normalization, and build behavior.
 */
export function createRouteUrlContract(
  route: RouterRouteUrlDescriptor,
  options: CreateRouterRouteUrlContractOptions = {},
): RouterRouteUrlContract {
  registerPathConstraints(options.pathConstraints);

  const urlOptions = resolveUrlOptions({
    ...(options.routerUrl === undefined ? {} : { router: options.routerUrl }),
    ...(route.url === undefined ? {} : { route: route.url }),
    ...(options.callUrl === undefined ? {} : { call: options.callUrl }),
  });

  try {
    return createUrlKitRouteUrlContract(createUrlKitRouteDescriptor(route), {
      params: 'parsed',
      ...toUrlKitContractOptions(urlOptions),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    }) as RouterRouteUrlContract;
  } catch (error) {
    throw createRouteUrlContractDiagnostic(error, options.routeId);
  }
}

function createUrlKitRouteDescriptor(route: RouterRouteUrlDescriptor): UrlKitStaticRouteDescriptor {
  return {
    ...(route.path === undefined ? {} : { path: route.path }),
    ...(route.search === undefined ? {} : { search: route.search }),
    ...(route.hash === undefined ? {} : { hash: route.hash as StaticHashDescriptor }),
  };
}
