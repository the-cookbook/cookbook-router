export function evaluateStaticRouteModule(path: string, sanitizedRoutesLiteral: string): unknown {
  try {
    return new Function(
      `"use strict"; const __cookbookRouteView = () => null; return (${sanitizedRoutesLiteral});`,
    )() as unknown;
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : '';

    throw new Error(
      `Route file "${path}" could not be evaluated as a static route declaration.${detail}`,
      {
        cause: error,
      },
    );
  }
}
