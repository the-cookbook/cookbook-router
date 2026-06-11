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
export type { CliRunnerOptions } from './cli/run-cli';
export { generateCommand, resolveRoutes } from './commands/generate';
export { manifestCommand } from './commands/manifest';
export { validateCommand } from './commands/validate';
export { watchCommand } from './commands/watch';
export { generateContracts } from './generation/generate-contracts';
export { generateManifest, serializeManifest } from './generation/generate-manifest';
export { generateRegister } from './generation/generate-register';
export { loadRouteFiles, validateRouteFiles } from './route-files/load-route-files';
export { runCli, shouldRunCli } from './cli/run-cli';

import { runCli, shouldRunCli } from './cli/run-cli';

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
