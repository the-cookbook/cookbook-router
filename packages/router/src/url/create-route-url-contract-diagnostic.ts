import { UrlKitError } from '@cookbook/urlkit';

export function createRouteUrlContractDiagnostic(
  error: unknown,
  routeId: string | undefined,
): Error {
  const routePrefix = routeId === undefined ? 'Route URL descriptor' : `Route "${routeId}"`;

  if (error instanceof UrlKitError) {
    return new UrlKitError(
      error.code,
      `${routePrefix} has an invalid URL descriptor. ${error.message}`,
      {
        ...(error.path === undefined ? {} : { path: error.path }),
        cause: error,
      },
    );
  }

  if (error instanceof Error && error.message.includes('URLKit error:')) {
    return error;
  }

  const message = `${routePrefix} has an invalid URL descriptor. URLKit error: ${getErrorMessage(error)}`;
  const wrapped = new Error(message);
  (wrapped as Error & { cause?: unknown }).cause = error;
  return wrapped;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
