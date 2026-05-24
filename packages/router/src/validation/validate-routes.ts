import {
  getPathParams,
  prunePathname,
  validatePathPattern,
  type RouterPathOptions,
} from '../pathkit/pathkit';
import type { RouteDefinition, RouteMeta, RouteSlotConfig } from '../routes/contracts';

interface ValidationContext {
  readonly pathOptions: RouterPathOptions;
  readonly ids: Set<string>;
  readonly paths: Map<string, string>;
  readonly slotFallbackIds: Set<string>;
  readonly parentPath?: string;
  readonly inheritedParams: readonly string[];
  readonly pathScope: string;
}

export function validateRoutes(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions = {},
): void {
  if (!Array.isArray(routes)) {
    throw new Error('Router routes must be an array.');
  }

  const context: ValidationContext = {
    ids: new Set<string>(),
    paths: new Map<string, string>(),
    slotFallbackIds: new Set<string>(),
    inheritedParams: [],
    pathScope: 'primary',
    pathOptions,
  };

  for (const route of routes) {
    validateRoute(route, context);
  }
}

function validateRoute(route: RouteDefinition, context: ValidationContext): void {
  if (!route || typeof route !== 'object') {
    throw new Error('Every route must be an object.');
  }

  validateRouteIdentity(route, context);
  validateRouteShape(route);
  validateRouteMetadata(route.id, route.meta);
  const fullPath = validateRoutePath(route, context);
  const params = mergeParamNames(
    route.id,
    context.inheritedParams,
    getOwnParamNames(route, context.pathOptions),
  );
  const childContext = createChildValidationContext(context, fullPath, params);
  validateLayoutSlots(route, childContext);
  validateIntercepts(route, context.pathOptions);

  for (const child of route.children ?? []) {
    validateRoute(child, childContext);
  }
}

function createChildValidationContext(
  context: ValidationContext,
  fullPath: string | undefined,
  inheritedParams: readonly string[],
): ValidationContext {
  const parentPath = fullPath ?? context.parentPath;

  return {
    ids: context.ids,
    paths: context.paths,
    slotFallbackIds: context.slotFallbackIds,
    inheritedParams,
    pathScope: context.pathScope,
    pathOptions: context.pathOptions,
    ...(parentPath === undefined ? {} : { parentPath }),
  };
}

function validateRouteIdentity(route: RouteDefinition, context: ValidationContext): void {
  if (!route.id || typeof route.id !== 'string') {
    throw new Error('Every route must define a non-empty string id.');
  }

  if (context.ids.has(route.id) || context.slotFallbackIds.has(route.id)) {
    throw new Error(`Duplicate route id "${route.id}".`);
  }

  context.ids.add(route.id);
}

function validateRouteShape(route: RouteDefinition): void {
  if (route.index !== undefined && typeof route.index !== 'boolean') {
    throw new Error(`Route "${route.id}" index must be a boolean when provided.`);
  }

  if (route.path !== undefined && typeof route.path !== 'string') {
    throw new Error(`Route "${route.id}" path must be a string when provided.`);
  }

  if (route.index && route.path !== undefined) {
    throw new Error(`Route "${route.id}" is an index route and must not define path.`);
  }

  if (route.index && route.children) {
    throw new Error(`Route "${route.id}" is an index route and must not define children.`);
  }

  if (route.children !== undefined && !Array.isArray(route.children)) {
    throw new Error(`Route "${route.id}" children must be an array.`);
  }

  if (
    route.layout !== undefined &&
    (!route.layout || typeof route.layout !== 'object' || Array.isArray(route.layout))
  ) {
    throw new Error(`Route "${route.id}" layout must be an object.`);
  }

  if (route.hash !== undefined) {
    if (!Array.isArray(route.hash)) {
      throw new Error(`Route "${route.id}" hash configuration must be an array.`);
    }

    const seen = new Set<string>();

    for (const hash of route.hash) {
      if (typeof hash !== 'string' || !hash) {
        throw new Error(`Route "${route.id}" defines an empty or non-string hash value.`);
      }

      if (hash.startsWith('#')) {
        throw new Error(`Route "${route.id}" hash value "${hash}" must not include a leading #.`);
      }

      if (seen.has(hash)) {
        throw new Error(`Route "${route.id}" defines duplicate hash value "${hash}".`);
      }

      seen.add(hash);
    }
  }

  if (
    route.search !== undefined &&
    (!route.search || typeof route.search !== 'object' || Array.isArray(route.search))
  ) {
    throw new Error(`Route "${route.id}" search configuration must be an object.`);
  }

  validateRedirect(route);
  validateRecordKeys(route.id, 'search', route.search);
  validateSearchSchema(route);
  validateRecordKeys(route.id, 'meta', route.meta);
}

function validateSearchSchema(route: RouteDefinition): void {
  if (!route.search) {
    return;
  }

  for (const [key, value] of Object.entries(route.search)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(
        `Route "${route.id}" search param "${key}" must use { type: 'one' | 'many', optional?: boolean }.`,
      );
    }

    if (value.type !== 'one' && value.type !== 'many') {
      throw new Error(`Route "${route.id}" search param "${key}" type must be "one" or "many".`);
    }

    if (value.optional !== undefined && typeof value.optional !== 'boolean') {
      throw new Error(
        `Route "${route.id}" search param "${key}" optional must be a boolean when provided.`,
      );
    }
  }
}

function validateRedirect(route: RouteDefinition): void {
  const redirect = route.redirect;

  if (redirect === undefined) {
    return;
  }

  if (typeof redirect === 'string') {
    if (!redirect) {
      throw new Error(`Route "${route.id}" redirect must be a non-empty string.`);
    }

    return;
  }

  if (!redirect || typeof redirect !== 'object' || Array.isArray(redirect)) {
    throw new Error(`Route "${route.id}" redirect must be a string or route target object.`);
  }

  if (!redirect.route || typeof redirect.route !== 'string') {
    throw new Error(`Route "${route.id}" redirect.route must be a non-empty string.`);
  }

  if (
    redirect.params !== undefined &&
    (!redirect.params || typeof redirect.params !== 'object' || Array.isArray(redirect.params))
  ) {
    throw new Error(`Route "${route.id}" redirect.params must be an object when provided.`);
  }

  if (
    redirect.search !== undefined &&
    (!redirect.search || typeof redirect.search !== 'object' || Array.isArray(redirect.search))
  ) {
    throw new Error(`Route "${route.id}" redirect.search must be an object when provided.`);
  }

  if (redirect.hash !== undefined && redirect.hash !== null && typeof redirect.hash !== 'string') {
    throw new Error(`Route "${route.id}" redirect.hash must be a string or null when provided.`);
  }
}

function validateRecordKeys(routeId: string, label: string, value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error(`Route "${routeId}" ${label} contains unsafe key "${key}".`);
    }
  }
}

function getOwnParamNames(
  route: RouteDefinition,
  pathOptions: RouterPathOptions,
): readonly string[] {
  if (!route.path || route.index) {
    return [];
  }

  const path = route.path.startsWith('/') ? route.path : `/${route.path}`;
  return getPathParams(prunePathname(path, pathOptions)).map((param) => param.name);
}

function validateRouteMetadata(routeId: string, meta: RouteMeta | undefined): void {
  if (meta !== undefined && (!meta || typeof meta !== 'object' || Array.isArray(meta))) {
    throw new Error(`Route "${routeId}" meta must be an object.`);
  }
}

function validateRoutePath(route: RouteDefinition, context: ValidationContext): string | undefined {
  const fullPath = resolveFullPath(route, context.parentPath);

  if (fullPath === undefined || route.index || route.path === undefined) {
    return fullPath;
  }

  validatePathPattern(fullPath, context.pathOptions);
  const normalizedFullPath = prunePathname(fullPath, context.pathOptions);
  const pathKey = `${context.pathScope}::${normalizedFullPath}`;
  const existingOwner = context.paths.get(pathKey);

  if (existingOwner && existingOwner !== route.id) {
    throw new Error(
      `Duplicate route path "${normalizedFullPath}" declared by routes "${existingOwner}" and "${route.id}".`,
    );
  }

  context.paths.set(pathKey, route.id);
  return normalizedFullPath;
}

function resolveFullPath(route: RouteDefinition, parentPath?: string): string | undefined {
  if (route.index) {
    return parentPath ?? '/';
  }

  if (route.path === undefined) {
    return parentPath;
  }

  if (!route.path) {
    throw new Error(`Route "${route.id}" defines an empty path.`);
  }

  return route.path.startsWith('/') ? route.path : joinPaths(parentPath ?? '/', route.path);
}

function validateLayoutSlots(route: RouteDefinition, context: ValidationContext): void {
  const slots = route.layout?.slots;

  if (!slots) {
    return;
  }

  if (typeof slots !== 'object' || Array.isArray(slots)) {
    throw new Error(`Route "${route.id}" layout.slots must be an object.`);
  }

  for (const [slotName, slot] of Object.entries(slots)) {
    if (!slotName) {
      throw new Error(`Route "${route.id}" defines a slot with an empty name.`);
    }

    if (slot === false) {
      continue;
    }

    validateSlotConfig(route.id, slotName, slot, context);
  }
}

function validateSlotConfig(
  routeId: string,
  slotName: string,
  slot: RouteSlotConfig,
  context: ValidationContext,
): void {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    throw new Error(`Route "${routeId}" defines invalid configuration for slot "${slotName}".`);
  }

  validateRouteMetadata(`${routeId}.${slotName}`, slot.meta);

  if (
    Object.prototype.hasOwnProperty.call(slot, 'fallback') &&
    slot.fallback !== null &&
    slot.fallback !== undefined
  ) {
    if (!slot.fallback.component) {
      throw new Error(`Route "${routeId}" slot "${slotName}" fallback must define component.`);
    }

    const fallbackId = slot.fallback.id ?? `${routeId}.${slotName}.fallback`;

    if (context.slotFallbackIds.has(fallbackId) || context.ids.has(fallbackId)) {
      throw new Error(`Duplicate route id "${fallbackId}".`);
    }

    validateRouteMetadata(fallbackId, slot.fallback.meta);
    context.slotFallbackIds.add(fallbackId);
  }

  if (slot.routes !== undefined && !Array.isArray(slot.routes)) {
    throw new Error(`Route "${routeId}" slot "${slotName}" routes must be an array.`);
  }

  const slotRouteContext: ValidationContext = {
    ...context,
    paths: new Map<string, string>(),
    pathScope: `slot:${routeId}:${slotName}`,
  };

  for (const slotRoute of slot.routes ?? []) {
    validateRoute(slotRoute, slotRouteContext);
  }
}

function validateIntercepts(route: RouteDefinition, pathOptions: RouterPathOptions): void {
  const intercepts = route.intercepts;

  if (!intercepts) {
    return;
  }

  if (typeof intercepts !== 'object' || Array.isArray(intercepts)) {
    throw new Error(`Route "${route.id}" intercepts must be an object.`);
  }

  for (const [slotName, config] of Object.entries(intercepts)) {
    if (!slotName) {
      throw new Error(`Route "${route.id}" defines an intercept with an empty slot name.`);
    }

    if (!config || typeof config !== 'object') {
      throw new Error(`Route "${route.id}" intercept for slot "${slotName}" must be an object.`);
    }

    if (!config.component) {
      throw new Error(
        `Route "${route.id}" intercept for slot "${slotName}" must define component.`,
      );
    }

    if (!Array.isArray(config.to) || !config.to.length) {
      throw new Error(
        `Route "${route.id}" intercept for slot "${slotName}" must define at least one target pattern.`,
      );
    }

    for (const pattern of config.to) {
      if (!pattern) {
        throw new Error(
          `Route "${route.id}" intercept for slot "${slotName}" defines an empty target pattern.`,
        );
      }

      validatePathPattern(pattern.startsWith('/') ? pattern : `/${pattern}`, pathOptions);
    }
  }
}

function mergeParamNames(
  routeId: string,
  inheritedParams: readonly string[],
  ownParams: readonly string[],
): readonly string[] {
  const params = [...inheritedParams];
  const inheritedNames = new Set(inheritedParams);

  for (const param of ownParams) {
    if (inheritedNames.has(param)) {
      throw new Error(`Route "${routeId}" declares duplicate inherited param "${param}".`);
    }

    if (!params.includes(param)) {
      params.push(param);
    }
  }

  return params;
}

function joinPaths(parentPath: string, childPath: string): string {
  const parent = parentPath === '/' ? '' : parentPath.replace(/\/$/, '');
  const child = childPath.replace(/^\//, '');

  return `${parent}/${child}` || '/';
}
