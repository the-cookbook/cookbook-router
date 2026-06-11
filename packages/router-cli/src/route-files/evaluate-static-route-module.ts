export function evaluateStaticRouteModule(path: string, sanitizedRoutesLiteral: string): unknown {
  try {
    return new Function(
      `"use strict"; const __cookbookRouteView = () => null; return (${sanitizedRoutesLiteral});`,
    )() as unknown;
  } catch (error) {
    throw new Error(`Route file "${path}" could not be evaluated as a static route declaration.`, {
      cause: error,
    });
  }
}
