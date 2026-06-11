import type { CliRouteOptions } from '../contracts';

export interface ParsedCliArguments {
  readonly command?: string;
  readonly options: CliRouteOptions;
  readonly watch: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly errors: readonly string[];
}

export function parseCliArguments(argv: readonly string[]): ParsedCliArguments {
  const routeFiles: string[] = [];
  const errors: string[] = [];
  let outDir: string | undefined;
  let command: string | undefined;
  let help = false;
  let version = false;
  let watch = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      help = true;
      continue;
    }

    if (arg === '-v' || arg === '--version') {
      version = true;
      continue;
    }

    if (arg === '--watch') {
      watch = true;
      continue;
    }

    if (arg === '--routes') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        errors.push('--routes requires a file path.');
      } else {
        routeFiles.push(value);
        index += 1;
      }
      continue;
    }

    if (arg?.startsWith('--routes=')) {
      const value = arg.slice('--routes='.length);
      if (!value) {
        errors.push('--routes requires a file path.');
      } else {
        routeFiles.push(value);
      }
      continue;
    }

    if (arg === '--out-dir') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        errors.push('--out-dir requires a directory path.');
      } else {
        outDir = value;
        index += 1;
      }
      continue;
    }

    if (arg?.startsWith('--out-dir=')) {
      const value = arg.slice('--out-dir='.length);
      if (!value) {
        errors.push('--out-dir requires a directory path.');
      } else {
        outDir = value;
      }
      continue;
    }

    if (arg?.startsWith('-')) {
      errors.push(`Unknown option "${arg}".`);
      continue;
    }

    if (!command) {
      command = arg;
      continue;
    }

    errors.push(`Unexpected positional argument "${arg}".`);
  }

  return {
    ...(command === undefined ? {} : { command }),
    options: {
      ...(routeFiles[0] ? { routeFiles } : {}),
      ...(outDir === undefined ? {} : { outDir }),
    },
    watch,
    help,
    version,
    errors,
  };
}
