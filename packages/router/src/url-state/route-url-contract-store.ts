import { registerPathConstraints, type RouterPathConstraints } from '../path/constraints';
import type { NormalizedRoute, RouteDefinition } from '../route-config/contracts';
import type {
  RouterRouteUrlContract,
  RouterRouteUrlDescriptor,
  RouterUrlOptions,
} from './contracts';
import { createRouteUrlContract } from './create-route-url-contract';

export interface RouteUrlContractStore {
  get(route: NormalizedRoute): RouterRouteUrlContract;
}

export interface CreateRouteUrlContractStoreOptions {
  readonly contracts?: WeakMap<RouteDefinition, RouterRouteUrlContract>;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routerUrl?: RouterUrlOptions;
}

export function createRouteUrlContractStore(
  options: CreateRouteUrlContractStoreOptions = {},
): RouteUrlContractStore {
  const cache = new WeakMap<RouteDefinition, RouterRouteUrlContract>();

  return {
    get(route) {
      registerPathConstraints(options.pathConstraints);

      const cached = cache.get(route.route);

      if (cached) {
        return cached;
      }

      const seeded = options.contracts?.get(route.route);

      if (seeded) {
        cache.set(route.route, seeded);
        return seeded;
      }

      const contract = createRouteUrlContract(createRouteDescriptor(route), {
        routeId: route.id,
        ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
        ...(options.pathConstraints === undefined
          ? {}
          : { pathConstraints: options.pathConstraints }),
      });

      cache.set(route.route, contract);

      return contract;
    },
  };
}

function createRouteDescriptor(route: NormalizedRoute): RouterRouteUrlDescriptor {
  return {
    ...(route.fullPath === undefined ? {} : { path: route.fullPath }),
    ...(route.route.search === undefined ? {} : { search: route.route.search }),
    ...(route.route.hash === undefined ? {} : { hash: route.route.hash }),
    ...(route.route.url === undefined ? {} : { url: route.route.url }),
  };
}
