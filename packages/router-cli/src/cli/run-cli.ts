import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommanderError } from 'commander';
import { createCliProgram } from './create-program';

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
  let exitCode = 0;
  const program = createCliProgram({
    ...runnerOptions,
    setExitCode(code) {
      exitCode = code;
    },
  });

  if (!argv.length) {
    const writeStdout =
      runnerOptions.stdout ??
      ((message: string) => {
        process.stdout.write(`${message}\n`);
      });
    writeStdout(program.helpInformation().replace(/\n$/, ''));
    return 0;
  }

  try {
    await program.parseAsync(argv, { from: 'user' });
    return exitCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    const writeStderr =
      runnerOptions.stderr ??
      ((message: string) => {
        process.stderr.write(`${message}\n`);
      });
    writeStderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
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
