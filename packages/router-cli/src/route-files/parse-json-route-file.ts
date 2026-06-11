import type { RouteFile } from '../contracts';
import { assertRouteFile } from './route-file-assertions';

export function parseJsonRouteFile(path: string, contents: string): RouteFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Route file "${path}" contains invalid JSON.`, { cause: error });
  }

  return assertRouteFile(path, parsed);
}
