import type { Middleware } from '../route-config/contracts';

export interface RuntimeMiddlewareRegistry {
  readonly getActiveMiddleware: () => readonly Middleware[];
  readonly useMiddleware: (middleware: readonly Middleware[]) => () => void;
  readonly clear: () => void;
}

export function createRuntimeMiddlewareRegistry(
  middleware: readonly Middleware[] | undefined,
): RuntimeMiddlewareRegistry {
  const runtimeMiddleware = new Set<Middleware>();

  return {
    getActiveMiddleware() {
      if (!runtimeMiddleware.size) {
        return middleware ?? [];
      }

      return [...(middleware ?? []), ...runtimeMiddleware];
    },
    useMiddleware(entries) {
      for (const entry of entries) {
        runtimeMiddleware.add(entry);
      }

      return () => {
        for (const entry of entries) {
          runtimeMiddleware.delete(entry);
        }
      };
    },
    clear() {
      runtimeMiddleware.clear();
    },
  };
}
