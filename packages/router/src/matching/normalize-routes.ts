import {
  getPathParams,
  getPathTokens,
  prunePathname,
  validatePathPattern,
  type RouterPathOptions,
} from '../pathkit/pathkit';
import { normalizeConfiguredIntercepts } from '../resolution/resolve-intercepts';
import type {
  NormalizedRoute,
  NormalizedRouteSlotConfig,
  NormalizedRouteSlots,
  RouteDefinition,
  RouteParamDefinition,
  RouteSlotConfig,
  RouteSlotDefinition,
} from '../routes/contracts';

interface NormalizeContext {
  readonly parentId?: string;
  readonly parentPath?: string;
  readonly inheritedParams: readonly RouteParamDefinition[];
  readonly nextOrder: () => number;
  readonly slotOwnerId?: string;
  readonly slotName?: string;
  readonly pathOptions: RouterPathOptions;
}

export function normalizeRoutes(
  routes: readonly RouteDefinition[],
  pathOptions: RouterPathOptions = {},
): readonly NormalizedRoute[] {
  let order = 0;
  const nextOrder = (): number => order++;

  return routes.map((route) =>
    normalizeRoute(route, { inheritedParams: [], nextOrder, pathOptions }),
  );
}

function normalizeRoute(route: RouteDefinition, context: NormalizeContext): NormalizedRoute {
  const localPath = route.path;
  const fullPath = resolveFullPath(route, context.parentPath, context.pathOptions);
  const ownParams = getOwnRouteParams(route);
  const params = mergeInheritedParams(route.id, context.inheritedParams, ownParams);
  const routeOrder = context.nextOrder();
  const normalizedSlots = normalizeLayoutSlots(route, {
    ...((fullPath ?? context.parentPath) === undefined
      ? {}
      : { parentPath: fullPath ?? context.parentPath }),
    inheritedParams: params,
    nextOrder: context.nextOrder,
    pathOptions: context.pathOptions,
  });
  const childParentPath = fullPath ?? context.parentPath;
  const children = (route.children ?? []).map((child) =>
    normalizeRoute(child, {
      parentId: route.id,
      ...(childParentPath === undefined ? {} : { parentPath: childParentPath }),
      inheritedParams: params,
      nextOrder: context.nextOrder,
      pathOptions: context.pathOptions,
    }),
  );
  const normalizedLayout = route.layout
    ? {
        ...(route.layout.component === undefined ? {} : { component: route.layout.component }),
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
    ...(route.component === undefined ? {} : { component: route.component }),
    params,
    index: route.index === true,
    score: fullPath ? scorePath(fullPath, route.index === true) : 0,
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
      nextOrder: context.nextOrder,
      pathOptions: context.pathOptions,
      slotOwnerId: ownerRouteId,
      slotName,
    }),
  );

  return {
    ownerRouteId,
    name: slotName,
    ...(config.component === undefined
      ? {}
      : {
          fallback: {
            ownerRouteId,
            slotName,
            component: config.component,
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

  return { component: slot };
}

function isSlotConfigObject(slot: RouteSlotDefinition): slot is RouteSlotConfig {
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(slot, 'component') ||
    Object.prototype.hasOwnProperty.call(slot, 'meta') ||
    Object.prototype.hasOwnProperty.call(slot, 'routes') ||
    Object.prototype.hasOwnProperty.call(slot, 'fallback') ||
    Object.prototype.hasOwnProperty.call(slot, 'id')
  );
}

function getOwnRouteParams(route: RouteDefinition): readonly RouteParamDefinition[] {
  if (!route.path || route.index) {
    return [];
  }

  return getPathParams(route.path.startsWith('/') ? route.path : `/${route.path}`);
}

function resolveFullPath(
  route: RouteDefinition,
  parentPath: string | undefined,
  pathOptions: RouterPathOptions,
): string | undefined {
  if (route.index) {
    return parentPath ?? '/';
  }

  if (route.path === undefined) {
    return parentPath;
  }

  const fullPath = route.path.startsWith('/')
    ? route.path
    : joinPaths(parentPath ?? '/', route.path);
  validatePathPattern(fullPath, pathOptions);

  return prunePathname(fullPath, pathOptions);
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

function scorePath(path: string, index: boolean): number {
  const segmentScore = getPathTokens(path).reduce((score, segment) => {
    if (segment.type === 'literal') {
      return score + scoreLiteralSegments(segment.value ?? '');
    }

    return score + (segment.wildcard ? 1 : 3);
  }, 0);

  return segmentScore + (index ? 2 : 0);
}

function scoreLiteralSegments(value: string): number {
  if (value === '/') {
    return 4;
  }

  return value.split('/').filter(Boolean).length * 5;
}
