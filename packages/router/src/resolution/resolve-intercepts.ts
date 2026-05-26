import {
  getPathTokens,
  matchPathPattern,
  validatePathPattern,
  type RouterPathOptions,
} from '../pathkit/pathkit';
import type {
  MatchedRoute,
  NormalizedIntercept,
  NormalizedRoute,
  RouteComponent,
  RouteMatch,
} from '../routes/contracts';

export interface CallSiteInterceptInput {
  readonly slot: string;
  readonly component?: RouteComponent;
  readonly element?: RouteComponent;
}

export type InterceptInput = string | CallSiteInterceptInput;

export interface InterceptHistoryState {
  readonly __cookbookRouterIntercept: {
    readonly slot: string;
    readonly sourceRouteId: string;
    readonly targetRouteId: string;
    readonly componentKey?: string;
    readonly previousHref: string;
    readonly context?: unknown;
  };
}

export interface ResolvedIntercept {
  readonly slot: string;
  readonly sourceRouteId: string;
  readonly targetRouteId: string;
  readonly component: RouteComponent;
  readonly previousLocation: string;
  readonly configured: boolean;
  readonly context?: unknown;
}

export interface ResolveInterceptOptions {
  readonly source: RouteMatch | null;
  readonly destination: RouteMatch | null;
  readonly destinationPathname: string;
  readonly intercept?: InterceptInput;
  readonly production?: boolean;
  readonly pathOptions?: RouterPathOptions;
  readonly previousHref?: string;
  readonly context?: unknown;
}

export function normalizeConfiguredIntercepts(
  route: NormalizedRoute,
  pathOptions: RouterPathOptions = {},
): readonly NormalizedIntercept[] {
  const intercepts = route.route.intercepts;

  if (!intercepts) {
    return [];
  }

  return Object.entries(intercepts).flatMap(([slot, config]) =>
    config.to.map((pattern) => {
      const resolvedPattern = resolveInterceptPattern(route.fullPath ?? '/', pattern);
      validatePathPattern(resolvedPattern, pathOptions);
      return {
        sourceRouteId: route.id,
        slot,
        to: resolvedPattern,
        component: config.component,
      };
    }),
  );
}

export function normalizeCallSiteIntercept(
  intercept: InterceptInput | undefined,
): CallSiteInterceptInput | null {
  if (!intercept || typeof intercept === 'string') {
    return null;
  }

  if (!intercept.slot) {
    throw new Error('Call-site intercept configuration must define a non-empty slot.');
  }

  const component = intercept.component ?? intercept.element;

  if (!component) {
    throw new Error(
      `Call-site intercept for slot "${intercept.slot}" must define component or element.`,
    );
  }

  return {
    slot: intercept.slot,
    component,
  };
}

export function resolveIntercept(options: ResolveInterceptOptions): ResolvedIntercept | null {
  if (!options.source || !options.destination) {
    return null;
  }

  const callSite = normalizeCallSiteIntercept(options.intercept);

  if (callSite) {
    const callSiteOwnerRouteId = resolveSlotOwner(
      options.source,
      callSite.slot,
      options.production === true,
    );

    if (!callSiteOwnerRouteId) {
      return null;
    }

    return {
      slot: callSite.slot,
      sourceRouteId: callSiteOwnerRouteId,
      targetRouteId: options.destination.route.id,
      component: callSite.component,
      previousLocation: options.previousHref ?? options.source.pathname,
      configured: false,
      ...(options.context === undefined ? {} : { context: options.context }),
    };
  }

  const explicitSlot = typeof options.intercept === 'string' ? options.intercept : undefined;
  const configured = findConfiguredIntercept(
    options.source.branch,
    explicitSlot,
    options.destinationPathname,
    options.pathOptions,
  );

  if (!configured) {
    return null;
  }

  const slotOwnerRouteId = resolveSlotOwner(
    options.source,
    configured.slot,
    options.production === true,
  );

  if (!slotOwnerRouteId) {
    return null;
  }

  return {
    slot: configured.slot,
    sourceRouteId: slotOwnerRouteId,
    targetRouteId: options.destination.route.id,
    component: configured.component,
    previousLocation: options.previousHref ?? options.source.pathname,
    configured: true,
    ...(options.context === undefined ? {} : { context: options.context }),
  };
}

export function restoreInterceptFromState(
  state: unknown,
  source: RouteMatch | null,
  destination: RouteMatch | null,
  pathOptions: RouterPathOptions = {},
): ResolvedIntercept | null {
  if (!isInterceptHistoryState(state) || !source || !destination) {
    return null;
  }

  const intercept = state.__cookbookRouterIntercept;

  if (intercept.targetRouteId !== destination.route.id) {
    return null;
  }

  const configured = findConfiguredIntercept(
    source.branch,
    intercept.slot,
    destination.pathname,
    pathOptions,
  );
  const component = intercept.componentKey
    ? readCallSiteInterceptComponent(intercept.componentKey)
    : configured?.component;

  if (!component) {
    return null;
  }

  return {
    slot: intercept.slot,
    sourceRouteId: intercept.sourceRouteId,
    targetRouteId: intercept.targetRouteId,
    component,
    previousLocation: intercept.previousHref,
    configured: intercept.componentKey === undefined,
    ...(intercept.context === undefined ? {} : { context: intercept.context }),
  };
}

export function createInterceptHistoryState(
  intercept: ResolvedIntercept,
  previousHref: string,
): InterceptHistoryState {
  const state: InterceptHistoryState['__cookbookRouterIntercept'] = {
    slot: intercept.slot,
    sourceRouteId: intercept.sourceRouteId,
    targetRouteId: intercept.targetRouteId,
    previousHref,
    ...(intercept.context === undefined ? {} : { context: intercept.context }),
  };

  if (!intercept.configured) {
    return {
      __cookbookRouterIntercept: {
        ...state,
        componentKey: registerCallSiteInterceptComponent(intercept.component),
      },
    };
  }

  return { __cookbookRouterIntercept: state };
}

export function validateInterceptTargets(
  routes: readonly NormalizedRoute[],
  pathOptions: RouterPathOptions = {},
): void {
  const flat = flattenRoutes(routes);

  for (const route of flat) {
    for (const intercept of route.intercepts) {
      const hasTarget = flat.some(
        (candidate) =>
          candidate.fullPath && patternsCouldMatch(intercept.to, candidate.fullPath, pathOptions),
      );

      if (!hasTarget) {
        throw new Error(
          `Route "${route.id}" intercept for slot "${intercept.slot}" targets unknown pattern "${intercept.to}".`,
        );
      }
    }
  }
}

const callSiteInterceptComponents = new Map<string, RouteComponent>();
let callSiteInterceptId = 0;

function registerCallSiteInterceptComponent(component: RouteComponent): string {
  callSiteInterceptId += 1;
  const key = `call-site:${callSiteInterceptId}`;
  callSiteInterceptComponents.set(key, component);
  return key;
}

function readCallSiteInterceptComponent(key: string): RouteComponent | undefined {
  return callSiteInterceptComponents.get(key);
}

function patternsCouldMatch(left: string, right: string, pathOptions: RouterPathOptions): boolean {
  return (
    patternSkeleton(left) === patternSkeleton(right) ||
    Boolean(matchPathPattern(left, right, pathOptions))
  );
}

function patternSkeleton(pattern: string): string {
  return getPathTokens(pattern)
    .map((segment) => (segment.type === 'parameter' ? '{}' : segment.value))
    .join('');
}

function findConfiguredIntercept(
  branch: readonly MatchedRoute[],
  slot: string | undefined,
  pathname: string,
  pathOptions: RouterPathOptions = {},
): NormalizedIntercept | null {
  for (let index = branch.length - 1; index >= 0; index--) {
    const route = branch[index]?.route;
    const intercept = route?.intercepts.find(
      (entry) =>
        (slot === undefined || entry.slot === slot) &&
        Boolean(matchPathPattern(entry.to, pathname, pathOptions)),
    );

    if (intercept) {
      return intercept;
    }
  }

  return null;
}

function resolveSlotOwner(source: RouteMatch, slot: string, production: boolean): string | null {
  for (let index = source.branch.length - 1; index >= 0; index--) {
    const ownerId = source.branch[index]?.id;

    if (ownerId && source.slots[ownerId]?.[slot]) {
      return ownerId;
    }
  }

  if (production) {
    return null;
  }

  throw new Error(
    `Cannot intercept route from "${source.route.id}" into slot "${slot}" because the current route tree does not define or render that slot.`,
  );
}

function isInterceptHistoryState(value: unknown): value is InterceptHistoryState {
  return Boolean(
    value &&
    typeof value === 'object' &&
    '__cookbookRouterIntercept' in value &&
    typeof (value as InterceptHistoryState).__cookbookRouterIntercept.slot === 'string',
  );
}

function resolveInterceptPattern(sourcePath: string, pattern: string): string {
  if (pattern.startsWith('/')) {
    return pattern;
  }

  const base = sourcePath === '/' ? '' : sourcePath.replace(/\/$/, '');
  return `${base}/${pattern.replace(/^\//, '')}` || '/';
}

function flattenRoutes(routes: readonly NormalizedRoute[]): readonly NormalizedRoute[] {
  return routes.flatMap((route) => [
    route,
    ...flattenRoutes(route.children),
    ...Object.values(route.layout?.slots ?? {}).flatMap((slot) => flattenRoutes(slot.routes)),
  ]);
}

export interface ResolveInterceptsOptions {
  readonly intercepts?: Readonly<
    Record<string, { readonly to: readonly string[]; readonly component: RouteComponent }>
  >;
  readonly slot?: string;
}

export function resolveIntercepts(options: ResolveInterceptsOptions = {}): readonly {
  readonly slot: string;
  readonly config: { readonly to: readonly string[]; readonly component: RouteComponent };
}[] {
  const intercepts = options.intercepts;

  if (!intercepts) {
    return [];
  }

  return Object.entries(intercepts)
    .filter(([slot]) => !options.slot || slot === options.slot)
    .map(([slot, config]) => ({ slot, config }));
}
