import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCommand } from '../commands/generate';
import { manifestCommand } from '../commands/manifest';
import { validateCommand } from '../commands/validate';
import { watchCommand } from '../commands/watch';
import { HELP_TEXT } from './help-text';
import { parseCliArguments } from './parse-cli-arguments';
import { reportCommandResult } from './report-command-result';

/** Options for embedding or testing the CLI runner. */
export interface CliRunnerOptions {
  readonly stdout?: (message: string) => void;
  readonly stderr?: (message: string) => void;
  readonly version?: string;
}

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
