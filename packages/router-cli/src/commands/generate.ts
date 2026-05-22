import { generateContracts } from '../generation/generate-contracts';
import { generateManifest, serializeManifest } from '../generation/generate-manifest';
import { generateRegister } from '../generation/generate-register';
import { loadRouteFiles } from '../validation/validate-route-files';
import type { CliFileSystem, CliRouteOptions, CommandResult } from '../contracts';
import type { RouteDefinition } from '@cookbook/router';
import {
  assertGeneratedOutputDoesNotClobberRouteFiles,
  resolveGeneratedOutputPaths,
} from '../security/safe-paths';
import { nodeFileSystem } from '../node-file-system';

const defaultFs: CliFileSystem = nodeFileSystem;

export interface GenerateOptions extends CliRouteOptions {}

export async function generateCommand(options: GenerateOptions): Promise<CommandResult> {
  try {
    const fs = options.fs ?? defaultFs;
    const output = resolveGeneratedOutputPaths(options.outDir);
    assertGeneratedOutputDoesNotClobberRouteFiles(output, options.routeFiles);
    const routes = await resolveRoutes(options);
    const { outDir, contractsPath, manifestPath, registerPath } = output;

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(contractsPath, generateContracts(routes));
    await fs.writeFile(manifestPath, serializeManifest(generateManifest(routes)));
    await fs.writeFile(registerPath, generateRegister());

    return { ok: true, files: [contractsPath, manifestPath, registerPath], errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function resolveRoutes(options: CliRouteOptions): Promise<readonly RouteDefinition[]> {
  if (options.routes) {
    return options.routes;
  }

  if (options.routeFiles?.[0]) {
    const sources = await loadRouteFiles({
      routeFiles: options.routeFiles,
      ...(options.fs === undefined ? {} : { fs: options.fs }),
    });
    return sources.flatMap((source) => source.routes);
  }

  throw new Error('No routes or routeFiles were provided.');
}
