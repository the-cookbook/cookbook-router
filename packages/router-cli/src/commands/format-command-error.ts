export function formatCommandError(error: unknown, verbose: boolean | undefined): string {
  if (!verbose) {
    return error instanceof Error ? error.message : String(error);
  }

  return formatVerboseError(error);
}

function formatVerboseError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const lines = [error.stack ?? error.message];
  let cause = error.cause;

  while (cause !== undefined) {
    if (cause instanceof Error) {
      lines.push(`Caused by: ${cause.stack ?? cause.message}`);
      cause = cause.cause;
      continue;
    }

    lines.push(`Caused by: ${String(cause)}`);
    break;
  }

  return lines.join('\n');
}
