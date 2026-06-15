import { Command } from 'commander';
import { generateCommand } from '../commands/generate';
import { initCommand } from '../commands/init';
import { manifestCommand } from '../commands/manifest';
import { validateCommand } from '../commands/validate';
import { watchCommand } from '../commands/watch';
import type { CliRouteOptions, CommandResult } from '../contracts';
import { reportCommandResult } from './report-command-result';

export interface CliProgramIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CreateCliProgramOptions extends Partial<CliProgramIo> {
  readonly version?: string;
  readonly setExitCode?: (code: number) => void;
}

interface CommonCommanderOptions {
  readonly config?: string;
  readonly routes?: readonly string[];
  readonly outDir?: string;
  readonly cwd?: string;
  readonly json?: boolean;
  readonly verbose?: boolean;
}

interface GenerateCommanderOptions extends CommonCommanderOptions {
  readonly watch?: boolean;
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function normalizeRouteFiles(routes: readonly string[] | undefined): readonly string[] | undefined {
  if (!routes?.length) {
    return undefined;
  }

  return routes;
}

function toCliRouteOptions(options: CommonCommanderOptions): CliRouteOptions {
  const normalizedFiles = normalizeRouteFiles(options.routes);

  return {
    ...(options.config === undefined ? {} : { configFile: options.config }),
    ...(options.outDir === undefined ? {} : { outDir: options.outDir }),
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    ...(options.verbose === undefined ? {} : { verbose: options.verbose }),
    ...(!normalizedFiles ? {} : { routeFiles: normalizedFiles }),
  };
}

function addRouteInputOptions(
  command: Command,
  descriptions: {
    readonly config?: string;
    readonly routes?: string;
    readonly outDir?: string;
  } = {},
): Command {
  return command
    .option(
      '--config <file>',
      descriptions.config ?? 'Router config file. Defaults to cookbook-router.config.*',
    )
    .option(
      '--routes <file>',
      descriptions.routes ?? 'Route source file or glob. May be repeated.',
      collect,
      [],
    )
    .option(
      '--out-dir <dir>',
      descriptions.outDir ?? 'Generated output directory. Defaults to .cookbook-router',
    )
    .option('--cwd <dir>', 'Project directory used to resolve config, routes, and output paths')
    .option('--json', 'Print the command result as JSON')
    .option('--verbose', 'Print additional diagnostics when available');
}

function setFailedExitCode(
  result: CommandResult,
  setExitCode: ((code: number) => void) | undefined,
): void {
  if (result.ok) {
    return;
  }

  if (setExitCode) {
    setExitCode(1);
  } else {
    process.exitCode = 1;
  }
}

function writeChunk(writer: (message: string) => void, chunk: string): void {
  const message = chunk.replace(/\n$/, '');

  if (!message) {
    return;
  }

  writer(message);
}

function report(
  result: CommandResult,
  commandOptions: CommonCommanderOptions,
  stdout: (message: string) => void,
  stderr: (message: string) => void,
): void {
  reportCommandResult(result, stdout, stderr, { json: commandOptions.json === true });
}

/** Creates the Commander-backed cookbook-router CLI program. */
export function createCliProgram(options: CreateCliProgramOptions = {}): Command {
  const stdout =
    options.stdout ??
    ((message: string) => {
      process.stdout.write(`${message}\n`);
    });
  const stderr =
    options.stderr ??
    ((message: string) => {
      process.stderr.write(`${message}\n`);
    });
  const setExitCode = options.setExitCode;

  const program = new Command();

  program
    .name('cookbook-router')
    .usage('<command> [options]')
    .description('Generate and validate cookbook-router route artifacts.')
    .version(options.version ?? '0.0.0', '-v, --version', 'Show version')
    .showHelpAfterError()
    .showSuggestionAfterError(false)
    .exitOverride()
    .configureOutput({
      writeOut: (chunk: string) => writeChunk(stdout, chunk),
      writeErr: (chunk: string) => writeChunk(stderr, chunk),
    });

  addRouteInputOptions(
    program
      .command('init')
      .description('Bootstrap cookbook-router.config.ts and generated artifacts'),
    {
      config: 'Router config file to create. Defaults to cookbook-router.config.ts',
      routes: 'Initial route source file or glob. May be repeated.',
      outDir: 'Generated output directory. Defaults to .cookbook-router',
    },
  ).action(async (commandOptions: CommonCommanderOptions) => {
    const result = await initCommand(toCliRouteOptions(commandOptions));
    report(result, commandOptions, stdout, stderr);
    setFailedExitCode(result, setExitCode);
  });

  addRouteInputOptions(
    program
      .command('generate')
      .description('Generate routes.ts, contracts.ts, register.d.ts, and manifest.json')
      .option('--watch', 'Watch for file changes and regenerate artifacts'),
  ).action(async (commandOptions: GenerateCommanderOptions) => {
    const cliOptions = toCliRouteOptions(commandOptions);

    if (commandOptions.watch) {
      const handle = watchCommand({
        ...cliOptions,
        onChange(result) {
          report(result, commandOptions, stdout, stderr);
        },
      });
      const initial = await handle.initial;
      setFailedExitCode(initial, setExitCode);
      return;
    }

    const result = await generateCommand(cliOptions);
    report(result, commandOptions, stdout, stderr);
    setFailedExitCode(result, setExitCode);
  });

  addRouteInputOptions(
    program.command('manifest').description('Generate manifest.json only'),
  ).action(async (commandOptions: CommonCommanderOptions) => {
    const result = await manifestCommand(toCliRouteOptions(commandOptions));
    report(result, commandOptions, stdout, stderr);
    setFailedExitCode(result, setExitCode);
  });

  addRouteInputOptions(
    program.command('validate').description('Validate route files without writing artifacts'),
  ).action(async (commandOptions: CommonCommanderOptions) => {
    const result = await validateCommand(toCliRouteOptions(commandOptions));
    report(result, commandOptions, stdout, stderr);
    setFailedExitCode(result, setExitCode);
  });

  return program;
}
