#!/usr/bin/env node

export type {
  CliFileSystem,
  CliOutputOptions,
  CliRouteOptions,
  CommandResult,
  LoadRouteFilesOptions,
  Register,
  RouteFile,
  RouterContracts,
  WatchHandle,
  WatchOptions,
} from './contracts';
export type { GenerateOptions } from './commands/generate';
export type { ManifestOptions } from './commands/manifest';
export type { ValidateOptions } from './commands/validate';
export type { WatchCommandOptions } from './commands/watch';
export type { ManifestRoute, RouteManifest } from './generation/generate-manifest';
export { generateCommand, resolveRoutes } from './commands/generate';
export { manifestCommand } from './commands/manifest';
export { validateCommand } from './commands/validate';
export { watchCommand } from './commands/watch';
export { generateContracts } from './generation/generate-contracts';
export { generateManifest, serializeManifest } from './generation/generate-manifest';
export { generateRegister } from './generation/generate-register';
export { loadRouteFiles, validateRouteFiles } from './validation/validate-route-files';

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCommand } from './commands/generate';
import { manifestCommand } from './commands/manifest';
import { validateCommand } from './commands/validate';
import { watchCommand } from './commands/watch';
import type { CliRouteOptions, CommandResult } from './contracts';

/** Options for embedding or testing the CLI runner. */
export interface CliRunnerOptions {
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly version?: string;
}

interface ParsedCliArguments {
  readonly command?: string;
  readonly options: CliRouteOptions;
  readonly watch: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly errors: readonly string[];
}

const HELP_TEXT = `cookbook-router <command> [options]

Commands:
  generate   Generate contracts.ts, register.d.ts, and manifest.json
  manifest   Generate manifest.json only
  validate   Validate route files without writing artifacts

Options:
  --routes <file>       Route source file. May be repeated.
  --out-dir <dir>       Generated output directory. Defaults to .cookbook-router
  --watch               Watch for files changes when used with generate
  -h, --help            Show help
  -v, --version         Show version`;

/**
 * Runs the CLI command dispatcher and returns a process-style exit code.
 */
export async function runCli(
  argv: readonly string[],
  runnerOptions: CliRunnerOptions = {},
): Promise<number> {
  const parsed = parseCliArguments(argv);
  const writeStdout =
    runnerOptions.stdout ??
    ((message) => {
      process.stdout.write(`${message}\n`);
    });
  const writeStderr =
    runnerOptions.stderr ??
    ((message) => {
      process.stderr.write(`${message}\n`);
    });

  if (parsed.version) {
    writeStdout(runnerOptions.version ?? '0.0.0');
    return 0;
  }

  if (parsed.help || !parsed.command) {
    writeStdout(HELP_TEXT);
    return parsed.errors[0] ? 1 : 0;
  }

  if (parsed.errors[0]) {
    writeStderr(parsed.errors.join('\n'));
    return 1;
  }

  if (parsed.command === 'generate') {
    if (parsed.watch) {
      const handle = watchCommand({
        ...parsed.options,
        onChange(result) {
          reportCommandResult(result, writeStdout, writeStderr);
        },
      });
      const initial = await handle.initial;
      return initial.ok ? 0 : 1;
    }

    return reportCommandResult(await generateCommand(parsed.options), writeStdout, writeStderr);
  }

  if (parsed.command === 'manifest') {
    return reportCommandResult(await manifestCommand(parsed.options), writeStdout, writeStderr);
  }

  if (parsed.command === 'validate') {
    return reportCommandResult(await validateCommand(parsed.options), writeStdout, writeStderr);
  }

  writeStderr(`Unknown command "${parsed.command}".\n\n${HELP_TEXT}`);
  return 1;
}

/** Returns true when the current module URL is the process entrypoint. */
export function shouldRunCli(
  moduleUrl: string = import.meta.url,
  argv: readonly string[] = process.argv,
): boolean {
  const entry = argv[1];

  if (!entry) {
    return false;
  }

  return resolve(fileURLToPath(moduleUrl)) === resolve(entry);
}

function reportCommandResult(
  result: CommandResult,
  writeStdout: (message: string) => void,
  writeStderr: (message: string) => void,
): number {
  if (!result.ok) {
    writeStderr(result.errors.join('\n'));
    return 1;
  }

  if (result.files[0]) {
    writeStdout(`Generated ${result.files.length.toString()} files.`);
    for (const file of result.files) {
      writeStdout(`  ${file}`);
    }
  } else {
    writeStdout('Routes are valid.');
  }

  return 0;
}

function parseCliArguments(argv: readonly string[]): ParsedCliArguments {
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

if (shouldRunCli()) {
  runCli(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
