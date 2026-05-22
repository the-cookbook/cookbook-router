export interface RouteDiagnosticLocation {
  readonly routeId?: string;
  readonly path?: string;
}

export function createUnknownRouteError(routeId: string): Error {
  return new Error(
    `Cannot generate href because route "${routeId}" is not registered. Check the route id or regenerate .cookbook-router/contracts.ts.`,
  );
}

export function createMissingPathError(routeId: string): Error {
  return new Error(
    `Cannot generate href for route "${routeId}" because it does not resolve to a URL path. Use a path or index route, or navigate to a concrete child route.`,
  );
}

export function createMissingParamError(
  routeId: string,
  paramName: string,
  token: string,
  value: unknown,
): Error {
  return new Error(
    `Route "${routeId}" expected param "${paramName}" to satisfy "${token}", but received ${formatDiagnosticValue(value)}.`,
  );
}

export function createInvalidParamError(
  routeId: string,
  paramName: string,
  token: string,
  value: unknown,
): Error {
  return new Error(
    `Route "${routeId}" expected param "${paramName}" to satisfy "${token}", but received ${formatDiagnosticValue(value)}.`,
  );
}

export function createGeneratedHrefMismatchError(
  routeId: string,
  href: string,
  routePath: string,
): Error {
  return new Error(
    `Generated href "${href}" for route "${routeId}" does not satisfy route path "${routePath}". Check params, basename, and path constraints.`,
  );
}

export function createMissingProviderError(hookName: string): Error {
  return new Error(`${hookName} must be used inside <RouterProvider> or <StaticRouterProvider>.`);
}

export function createMissingOutletContextError(routeId: string | undefined): Error {
  const route = routeId ? ` for route "${routeId}"` : '';
  return new Error(
    `Outlet context${route} was requested in strict mode, but no context was provided by the parent Outlet or Slot.`,
  );
}

export function createHydrationMismatchError(serverHref: string, clientHref: string): Error {
  return new Error(
    `Hydration data was created for "${serverHref}", but the client history is currently at "${clientHref}". Recreate the router with matching hydration data or omit hydrationData for client-only rendering.`,
  );
}

export function createMalformedRedirectError(to: unknown): Error {
  return new Error(
    `Middleware redirect target must be a non-empty string, but received ${formatDiagnosticValue(to)}.`,
  );
}

export function formatDiagnosticValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  return JSON.stringify(value) ?? String(value);
}
