import type { RouteFile } from '../contracts';

export function assertRouteFile(path: string, value: unknown): RouteFile {
  if (!isRouteFile(value)) {
    throw new Error(`Route file "${path}" must provide a routes array.`);
  }

  return value;
}

export function isRouteFile(value: unknown): value is RouteFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { routes?: unknown }).routes)
  );
}
