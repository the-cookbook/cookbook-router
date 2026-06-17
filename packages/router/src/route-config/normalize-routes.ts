import { analyzePathPattern, type AnalyzedPathPattern } from '../path/analyze-path-pattern';
import { prunePathname, type RouterPathOptions } from '../path/options';
import { normalizeConfiguredIntercepts } from '../rendering/resolve-intercepts';
import { createRouteUrlContract } from '../url-state/create-route-url-contract';
import type {
  NormalizedRoute,
  NormalizedRouteSlotConfig,
  NormalizedRouteSlots,
  RouteDefinition,
  RouteParamDefinition,
  RouteSlotConfig,
  RouteSlotDefinition,
} from '../route-config/contracts';

const EMPTY_ROUTE_PARAMS = Object.freeze([]) as readonly RouteParamDefinition[];
const EMPTY_PATH_ANALYSIS = Object.freeze({
  params: EMPTY_ROUTE_PARAMS,
  score: 0,
  depth: 0,
}) satisfies AnalyzedPathPattern;

interface NormalizeContext {
  readonly parentId?: string;
  readonly parentPath?: string;
  readonly inheritedParams: readonly RouteParamDefinition[];
  readonly parentScore: number;
  readonly parentDepth: number;
  readonly nextOrder: () => number;
  readonly slotOwnerId?: string;
  readonly slotName?: string;
  readonly pathOptions: RouterPathOptions;
  readonly validatePaths: boolean;
}

export function normalizeRoutes(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions = {},
): readonly NormalizedRoute[] {
  return normalizeRoutesInternal(routes, pathOptions, true);
}

export function normalizeValidatedRoutes(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions = {},
): readonly NormalizedRoute[] {
  return normalizeRoutesInternal(routes, pathOptions, false);
}

function normalizeRoutesInternal(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions,
  validatePaths: boolean,
): readonly NormalizedRoute[] {
  let order = 0;
  const nextOrder = (): number => order++;

  return routes.map((route) =>
    normalizeRoute(route, {
      inheritedParams: [],
      parentScore: 0,
      parentDepth: 0,
      nextOrder,
      pathOptions,
      validatePaths,
    }),
  );
}

function normalizeRoute(route: RouteDefinition, context: NormalizeContext): NormalizedRoute {
  const localPath = route.path;
  const fullPath = resolveFullPath(
    route,
    context.parentPath,
    context.pathOptions,
    context.validatePaths,
  );
  const localAnalysis = analyzeRouteLocalPath(route);
  const ownParams = route.index ? [] : localAnalysis.params;
  const params = mergeInheritedParams(route.id, context.inheritedParams, ownParams);
  const score = context.parentScore + (route.index ? 2 : localAnalysis.score);
  const pathDepth = context.parentDepth + (route.index ? 0 : localAnalysis.depth);
  const routeOrder = context.nextOrder();
  const normalizedSlots = normalizeLayoutSlots(route, {
    ...((fullPath ?? context.parentPath) === undefined
      ? {}
      : { parentPath: fullPath ?? context.parentPath }),
    inheritedParams: params,
    parentScore: score,
    parentDepth: pathDepth,
    nextOrder: context.nextOrder,
    pathOptions: context.pathOptions,
    validatePaths: context.validatePaths,
  });
  const childParentPath = fullPath ?? context.parentPath;
  const children = (route.children ?? []).map((child) =>
    normalizeRoute(child, {
      parentId: route.id,
      ...(childParentPath === undefined ? {} : { parentPath: childParentPath }),
      inheritedParams: params,
      parentScore: score,
      parentDepth: pathDepth,
      nextOrder: context.nextOrder,
      pathOptions: context.pathOptions,
      validatePaths: context.validatePaths,
    }),
  );
  const normalizedLayout = route.layout
    ? {
        ...(route.layout.view === undefined ? {} : { view: route.layout.view }),
        ...(normalizedSlots === undefined ? {} : { slots: normalizedSlots }),
      }
    : undefined;

  const normalizedRoute: NormalizedRoute = {
    id: route.id,
    ...(localPath === undefined ? {} : { localPath }),
    ...(fullPath === undefined ? {} : { fullPath }),
    ...(context.parentId === undefined ? {} : { parentId: context.parentId }),
    children,
    ...(normalizedLayout === undefined ? {} : { layout: normalizedLayout }),
    ...(route.view === undefined ? {} : { view: route.view }),
    params,
    index: route.index === true,
    score,
    pathDepth,
    order: routeOrder,
    route,
    ...(route.meta === undefined ? {} : { meta: route.meta }),
    ...(route.lifecycle === undefined ? {} : { lifecycle: route.lifecycle }),
    ...(route.middleware === undefined ? {} : { middleware: route.middleware }),
    ...(context.slotOwnerId === undefined ? {} : { slotOwnerId: context.slotOwnerId }),
    ...(context.slotName === undefined ? {} : { slotName: context.slotName }),
    slotRoute: context.slotOwnerId !== undefined,
    intercepts: [],
  };

  return {
    ...normalizedRoute,
    intercepts: normalizeConfiguredIntercepts(normalizedRoute, context.pathOptions),
  };
}

function normalizeLayoutSlots(
  route: RouteDefinition,
  context: Omit<NormalizeContext, 'parentId' | 'slotOwnerId' | 'slotName'>,
): NormalizedRouteSlots | undefined {
  const slots = route.layout?.slots;

  if (!slots) {
    return undefined;
  }

  const normalized: Record<string, NormalizedRouteSlotConfig> = {};

  for (const [slotName, slot] of Object.entries(slots)) {
    normalized[slotName] = normalizeSlotConfig(route.id, slotName, slot, context);
  }

  return normalized;
}

function normalizeSlotConfig(
  ownerRouteId: string,
  slotName: string,
  slot: RouteSlotDefinition,
  context: Omit<NormalizeContext, 'parentId' | 'slotOwnerId' | 'slotName'>,
): NormalizedRouteSlotConfig {
  const config = normalizeSlotDefinition(slot);
  const routes = (config.routes ?? []).map((slotRoute) =>
    normalizeRoute(slotRoute, {
      parentId: ownerRouteId,
      ...(context.parentPath === undefined ? {} : { parentPath: context.parentPath }),
      inheritedParams: context.inheritedParams,
      parentScore: context.parentScore,
      parentDepth: context.parentDepth,
      nextOrder: context.nextOrder,
      pathOptions: context.pathOptions,
      validatePaths: context.validatePaths,
      slotOwnerId: ownerRouteId,
      slotName,
    }),
  );

  return {
    ownerRouteId,
    name: slotName,
    ...(config.view === undefined
      ? {}
      : {
          fallback: {
            ownerRouteId,
            slotName,
            view: config.view,
            ...(config.meta === undefined ? {} : { meta: config.meta }),
          },
        }),
    routes,
    ...(config.meta === undefined ? {} : { meta: config.meta }),
    disabled: false,
  };
}

function normalizeSlotDefinition(slot: RouteSlotDefinition): RouteSlotConfig {
  if (slot === true) {
    return {};
  }

  if (isSlotConfigObject(slot)) {
    return slot;
  }

  return { view: slot };
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

function analyzeRouteLocalPath(route: RouteDefinition): AnalyzedPathPattern {
  if (!route.path || route.index) {
    return EMPTY_PATH_ANALYSIS;
  }

  return analyzePathPattern(route.path.startsWith('/') ? route.path : `/${route.path}`);
}

function resolveFullPath(
  route: RouteDefinition,
  parentPath: string | undefined,
  pathOptions: RouterPathOptions,
  validatePath: boolean,
): string | undefined {
  if (route.index) {
    return parentPath ?? '/';
  }

  if (route.path === undefined) {
    return parentPath;
  }

  const fullPath = resolveRoutePath(parentPath, route.path);

  if (validatePath) {
    createRouteUrlContract({ path: prunePathname(fullPath, pathOptions) }, { routeId: route.id });
  }

  return prunePathname(fullPath, pathOptions);
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

function mergeInheritedParams(
  routeId: string,
  inheritedParams: readonly RouteParamDefinition[],
  ownParams: readonly RouteParamDefinition[],
): readonly RouteParamDefinition[] {
  const params = [...inheritedParams];
  const inheritedNames = new Set(inheritedParams.map((param) => param.name));

  for (const param of ownParams) {
    if (inheritedNames.has(param.name)) {
      throw new Error(`Route "${routeId}" declares duplicate inherited param "${param.name}".`);
    }

    if (!params.some((existing) => existing.name === param.name)) {
      params.push(param);
    }
  }

  return params;
}
