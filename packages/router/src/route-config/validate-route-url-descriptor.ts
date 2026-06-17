import { createRouteUrlContract } from '../url-state/create-route-url-contract';
import type { RouterPathConstraints } from '../path/constraints';
import type { RouteDefinition } from '../route-config/contracts';
import type { RouterRouteUrlContract, RouterUrlOptions } from '../url-state/contracts';

interface ValidateRouteUrlDescriptorOptions {
  readonly route: RouteDefinition;
  readonly fullPath?: string;
  readonly routerUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

export function validateRouteUrlDescriptor(
  options: ValidateRouteUrlDescriptorOptions,
): RouterRouteUrlContract | undefined {
  validateRouterHashDescriptor(options.route);

  const hasUrlDescriptor =
    options.route.path !== undefined ||
    options.route.index === true ||
    options.route.search !== undefined ||
    options.route.hash !== undefined;

  if (!hasUrlDescriptor) {
    return undefined;
  }

  return createRouteUrlContract(
    {
      ...(options.fullPath === undefined ? {} : { path: options.fullPath }),
      ...(options.route.search === undefined ? {} : { search: options.route.search }),
      ...(options.route.hash === undefined ? {} : { hash: options.route.hash }),
      ...(options.route.url === undefined ? {} : { url: options.route.url }),
    },
    {
      routeId: options.route.id,
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    },
  );
}

function validateRouterHashDescriptor(route: RouteDefinition): void {
  if (!isRecord(route.hash)) {
    return;
  }

  validateHashLeadingSign(route.id, route.hash);
}

function validateHashLeadingSign(routeId: string, hash: Record<string, unknown>): void {
  if (typeof hash.default === 'string') {
    validateHashValueWithoutLeadingSign(routeId, hash.default);
  }

  if (!Array.isArray(hash.values)) {
    return;
  }

  for (const value of hash.values) {
    if (typeof value === 'string') {
      validateHashValueWithoutLeadingSign(routeId, value);
    }
  }
}

function validateHashValueWithoutLeadingSign(routeId: string, hash: string): void {
  if (!hash.startsWith('#')) {
    return;
  }

  throw new Error(`Route "${routeId}" hash value "${hash}" must not include a leading #.`);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
