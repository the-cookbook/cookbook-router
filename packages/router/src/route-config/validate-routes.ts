import { analyzePathPattern } from '../path/analyze-path-pattern';
import {
  hasPathConstraint,
  registerPathConstraints,
  type RouterPathConstraints,
} from '../path/constraints';
import { prunePathname, type RouterPathOptions } from '../path/options';
import { validateRouteUrlDescriptor } from './validate-route-url-descriptor';
import { normalizeValidatedRoutes } from './normalize-routes';
import type {
  NormalizedRoute,
  RouteDefinition,
  RouteMeta,
  RouteSlotConfig,
  RouteSlotDefinition,
} from '../route-config/contracts';
import type { RouterRouteUrlContract, RouterUrlOptions } from '../url-state/contracts';

interface ValidationContext {
  readonly pathOptions: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routerUrl?: RouterUrlOptions;
  readonly contracts: WeakMap<RouteDefinition, RouterRouteUrlContract>;
  readonly ids: Set<string>;
  readonly paths: Map<string, string>;
  readonly slotFallbackIds: Set<string>;
  readonly parentPath?: string;
  readonly activeLayoutRouteId?: string;
  readonly declaredSlots: ReadonlySet<string>;
  readonly inheritedParams: readonly string[];
  readonly pathScope: string;
  readonly interceptTargets: InterceptTargetValidation[];
}

interface InterceptTargetValidation {
  readonly routeId: string;
  readonly slotName: string;
  readonly targetRouteId: string;
}

export interface ValidatedRouteTree {
  readonly contracts: WeakMap<RouteDefinition, RouterRouteUrlContract>;
}

export interface ValidateRoutesWithContractsOptions {
  readonly pathOptions?: RouterPathOptions;
  readonly pathConstraints?: RouterPathConstraints;
  readonly routerUrl?: RouterUrlOptions;
}

export function validateRoutes(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions = {},
): void {
  validateRoutesWithContracts(routes, { pathOptions });
}

export function validateRoutesWithContracts(
  routes: readonly RouteDefinition[],
  options: ValidateRoutesWithContractsOptions = {},
): ValidatedRouteTree {
  if (!Array.isArray(routes)) {
    throw new Error('Router routes must be an array.');
  }

  registerPathConstraints(options.pathConstraints);

  const contracts = new WeakMap<RouteDefinition, RouterRouteUrlContract>();
  const context: ValidationContext = {
    ids: new Set<string>(),
    paths: new Map<string, string>(),
    slotFallbackIds: new Set<string>(),
    inheritedParams: [],
    declaredSlots: new Set<string>(),
    pathScope: 'primary',
    pathOptions: options.pathOptions ?? {},
    contracts,
    interceptTargets: [],
    ...(options.pathConstraints === undefined ? {} : { pathConstraints: options.pathConstraints }),
    ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
  };

  for (const route of routes) {
    validateRoute(route, context);
  }

  validateCollectedInterceptTargets(context);

  return { contracts };
}

/**
 * Validates and normalizes a complete resolved route tree through the same path
 * used by runtime matching. Use this before writing generated artifacts.
 */
export function validateResolvedRouteTree(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions = {},
): readonly NormalizedRoute[] {
  validateRoutesWithContracts(routes, { pathOptions });
  return normalizeValidatedRoutes(routes, pathOptions);
}

function validateRoute(route: RouteDefinition, context: ValidationContext): void {
  if (!route || typeof route !== 'object') {
    throw new Error('Every route must be an object.');
  }

  validateRouteIdentity(route, context);
  validateRouteShape(route);
  validateRouteMetadata(route.id, route.meta);

  const fullPath = validateRoutePath(route, context);
  const contract = validateRouteUrlDescriptor({
    route,
    ...(fullPath === undefined ? {} : { fullPath }),
    ...(context.routerUrl === undefined ? {} : { routerUrl: context.routerUrl }),
    ...(context.pathConstraints === undefined ? {} : { pathConstraints: context.pathConstraints }),
  });

  if (contract) {
    context.contracts.set(route, contract);
  }
  const params = mergeParamNames(
    route.id,
    context.inheritedParams,
    getOwnParamNames(route, context.pathOptions),
  );
  validateLayoutScope(route, context);
  const layoutContext = {
    ...context,
    ...(fullPath === undefined ? {} : { parentPath: fullPath }),
  };

  validateLayoutSlots(route, layoutContext);
  validateIntercepts(route, context, route);

  const childContext = createChildValidationContext(context, route, fullPath, params);

  for (const child of route.children ?? []) {
    validateRoute(child, childContext);
  }
}

function createChildValidationContext(
  context: ValidationContext,
  route: RouteDefinition,
  fullPath: string | undefined,
  inheritedParams: readonly string[],
): ValidationContext {
  const parentPath = fullPath ?? context.parentPath;
  const declaredSlots = new Set(context.declaredSlots);

  for (const slotName of Object.keys(route.layout?.slots ?? {})) {
    declaredSlots.add(slotName);
  }

  const activeLayoutRouteId =
    route.layout?.view === undefined ? context.activeLayoutRouteId : route.id;

  return {
    ids: context.ids,
    paths: context.paths,
    slotFallbackIds: context.slotFallbackIds,
    inheritedParams,
    pathScope: context.pathScope,
    pathOptions: context.pathOptions,
    contracts: context.contracts,
    interceptTargets: context.interceptTargets,
    ...(context.pathConstraints === undefined ? {} : { pathConstraints: context.pathConstraints }),
    ...(context.routerUrl === undefined ? {} : { routerUrl: context.routerUrl }),
    declaredSlots,
    ...(activeLayoutRouteId === undefined ? {} : { activeLayoutRouteId }),
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

  if (route.preload !== undefined && typeof route.preload !== 'function') {
    throw new Error(`Route "${route.id}" preload must be a function when provided.`);
  }

  if (route.modulePreload !== undefined && typeof route.modulePreload !== 'function') {
    throw new Error(`Route "${route.id}" modulePreload must be a function when provided.`);
  }

  if (Object.prototype.hasOwnProperty.call(route, 'errorFallback')) {
    throw new Error(
      `Route "${route.id}" declares errorFallback, but route errorFallback is no longer supported. Use error instead.`,
    );
  }

  if (
    route.layout !== undefined &&
    (!route.layout || typeof route.layout !== 'object' || Array.isArray(route.layout))
  ) {
    throw new Error(`Route "${route.id}" layout must be an object.`);
  }

  if (
    route.search !== undefined &&
    (!route.search || typeof route.search !== 'object' || Array.isArray(route.search))
  ) {
    throw new Error(`Route "${route.id}" search configuration must be an object.`);
  }

  validateDuplicateIndexChildren(route);
  validateRedirect(route);
  validateRecordKeys(route.id, 'search', route.search);
  validateRecordKeys(route.id, 'meta', route.meta);
  validatePathlessRouteShape(route);
}

function validateDuplicateIndexChildren(route: RouteDefinition): void {
  let indexRouteId: string | undefined;

  for (const child of route.children ?? []) {
    if (child.index !== true) {
      continue;
    }

    if (indexRouteId !== undefined) {
      throw new Error(
        `Routes "${indexRouteId}" and "${child.id}" are duplicate index routes under parent "${route.id}".`,
      );
    }

    indexRouteId = child.id;
  }
}

function validatePathlessRouteShape(route: RouteDefinition): void {
  if (route.index || route.path !== undefined) {
    return;
  }

  const hasChildren = Array.isArray(route.children) && Boolean(route.children.length);
  const hasRenderableOrNavigableDeclaration =
    route.view !== undefined ||
    route.redirect !== undefined ||
    route.search !== undefined ||
    route.hash !== undefined ||
    route.intercepts !== undefined ||
    route.middleware !== undefined ||
    route.lifecycle !== undefined ||
    route.loading !== undefined ||
    route.error !== undefined;

  if (!hasChildren || hasRenderableOrNavigableDeclaration) {
    throw new Error(
      `Route "${route.id}" must define either path or index. Pathless routes are only supported as layout/group routes with children.`,
    );
  }
}

function validateRedirect(route: RouteDefinition): void {
  const redirect = route.redirect;

  if (redirect === undefined) {
    return;
  }

  if (route.children?.length) {
    throw new Error(`Route "${route.id}" defines redirect and must not define children.`);
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
  return analyzePathPattern(prunePathname(path, pathOptions)).params.map((param) => param.name);
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

  const normalizedFullPath = prunePathname(fullPath, context.pathOptions);
  const pathKey = `${context.pathScope}::${normalizedFullPath}`;
  const existingOwner = context.paths.get(pathKey);

  if (existingOwner && existingOwner !== route.id) {
    throw new Error(
      `Duplicate route path "${normalizedFullPath}" declared by routes "${existingOwner}" and "${route.id}".`,
    );
  }

  context.paths.set(pathKey, route.id);
  validatePathConstraintReferences(normalizedFullPath);
  return normalizedFullPath;
}

function validatePathConstraintReferences(path: string): void {
  for (const param of analyzePathPattern(path).params) {
    for (const constraint of param.constraints) {
      if (hasPathConstraint(constraint.type)) {
        continue;
      }

      throw new Error(`Unknown constraint type: "${constraint.type}"`);
    }
  }
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

  return resolveRoutePath(parentPath, route.path);
}

function validateLayoutScope(route: RouteDefinition, context: ValidationContext): void {
  const layout = route.layout;

  if (!layout) {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(layout, 'errorFallback')) {
    throw new Error(
      `Route "${route.id}" declares layout.errorFallback, but layout errorFallback is no longer supported. Use layout.error instead.`,
    );
  }

  const hasLayoutComponentInScope =
    layout.view !== undefined || context.activeLayoutRouteId !== undefined;

  if ((layout.loading !== undefined || layout.error !== undefined) && !hasLayoutComponentInScope) {
    throw new Error(
      `Route "${route.id}" declares layout.loading/layout.error, but no active layout view exists. Use route.loading/route.error for route-local fallbacks, or declare layout.view.`,
    );
  }

  if (layout.slots !== undefined && !hasLayoutComponentInScope) {
    throw new Error(
      `Route "${route.id}" declares layout.slots, but no active layout view exists in its ancestor tree. Slot declarations require layout.view on the same route or an ancestor route.`,
    );
  }
}

function validateLayoutSlots(route: RouteDefinition, context: ValidationContext): void {
  const slots = route.layout?.slots;

  if (!slots) {
    return;
  }

  if (typeof slots !== 'object' || Array.isArray(slots)) {
    throw new Error(`Route "${route.id}" layout.slots must be an object.`);
  }

  const ownsLayoutComponent = route.layout?.view !== undefined;

  for (const [slotName, slot] of Object.entries(slots)) {
    if (!slotName) {
      throw new Error(`Route "${route.id}" defines a slot with an empty name.`);
    }

    if (!ownsLayoutComponent && !context.declaredSlots.has(slotName)) {
      throw new Error(
        `Missing slot "${slotName}" for route "${route.id}". Declare "layout.slots.${slotName}" on an active ancestor layout or remove the child slot declaration.`,
      );
    }

    validateSlotDefinition(route.id, slotName, slot, context);
  }
}

function validateSlotDefinition(
  routeId: string,
  slotName: string,
  slot: RouteSlotDefinition,
  context: ValidationContext,
): void {
  if (slot === true) {
    return;
  }

  if (slot === false || slot === null || slot === undefined) {
    throw new Error(
      `Route "${routeId}" declares invalid configuration for slot "${slotName}". Use a view, { view?, meta?, routes? }, or true.`,
    );
  }

  if (!isSlotConfigObject(slot)) {
    return;
  }

  validateSlotConfig(routeId, slotName, slot, context);
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

  if (Object.prototype.hasOwnProperty.call(slot, 'id')) {
    throw new Error(
      `Route "${routeId}" declares "layout.slots.${slotName}.id", but slot IDs are no longer supported. Use the slot key as the slot identity.`,
    );
  }

  if (Object.prototype.hasOwnProperty.call(slot, 'fallback')) {
    throw new Error(
      `Unsupported slot fallback: slot fallbacks are no longer supported on route "${routeId}". Remove "layout.slots.${slotName}.fallback"; use "layout.slots.${slotName}" instead.`,
    );
  }

  for (const key of Object.keys(slot)) {
    if (key !== 'view' && key !== 'meta' && key !== 'routes') {
      throw new Error(
        `Unsupported slot key "${key}" on route "${routeId}". Remove "layout.slots.${slotName}.${key}". Supported slot keys are "view", "meta", and "routes".`,
      );
    }
  }

  validateRouteMetadata(`${routeId}.${slotName}`, slot.meta);

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

function isSlotConfigObject(slot: RouteSlotDefinition): slot is RouteSlotConfig {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(slot, 'view') ||
    Object.prototype.hasOwnProperty.call(slot, 'meta') ||
    Object.prototype.hasOwnProperty.call(slot, 'routes') ||
    Object.prototype.hasOwnProperty.call(slot, 'fallback') ||
    Object.prototype.hasOwnProperty.call(slot, 'id')
  );
}

function validateIntercepts(
  route: RouteDefinition,
  context: ValidationContext,
  sourceRoute: RouteDefinition,
): void {
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

    const localSlots = sourceRoute.layout?.slots;
    const declaresSlotLocally = Boolean(
      localSlots && Object.prototype.hasOwnProperty.call(localSlots, slotName),
    );

    if (!declaresSlotLocally && !context.declaredSlots.has(slotName)) {
      throw new Error(
        `Invalid intercept slot "${slotName}" on route "${route.id}". The route configures this intercept slot, but neither this route nor an active ancestor layout declares "layout.slots.${slotName}". Declare the slot or remove the intercept slot configuration.`,
      );
    }
    if (!config.view) {
      throw new Error(`Route "${route.id}" intercept for slot "${slotName}" must define view.`);
    }

    const targets = normalizeInterceptTargetIds(config.to);

    if (!targets.length) {
      throw new Error(
        `Route "${route.id}" intercept for slot "${slotName}" must define at least one target route id.`,
      );
    }

    for (const targetRouteId of targets) {
      if (!targetRouteId) {
        throw new Error(
          `Route "${route.id}" intercept for slot "${slotName}" defines an empty target route id.`,
        );
      }

      context.interceptTargets.push({ routeId: route.id, slotName, targetRouteId });
    }
  }
}

function validateCollectedInterceptTargets(context: ValidationContext): void {
  for (const target of context.interceptTargets) {
    if (context.ids.has(target.targetRouteId)) {
      continue;
    }

    throw new Error(
      `Route "${target.routeId}" intercept "${target.slotName}" targets unknown route id "${target.targetRouteId}" (targets missing route "${target.targetRouteId}").`,
    );
  }
}

function normalizeInterceptTargetIds(targets: unknown): readonly string[] {
  if (typeof targets === 'string') {
    return [targets];
  }

  if (!Array.isArray(targets)) {
    return [];
  }

  return targets.filter((target): target is string => typeof target === 'string');
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

function resolveRoutePath(parentPath: string | undefined, routePath: string): string {
  if (parentPath === undefined) {
    return routePath.startsWith('/') ? routePath : joinPaths('/', routePath);
  }

  return joinPaths(parentPath, routePath);
}

function joinPaths(parentPath: string, childPath: string): string {
  const parent = parentPath === '/' ? '' : parentPath.replace(/\/$/, '');
  const child = childPath.replace(/^\//, '');

  return `${parent}/${child}` || '/';
}
