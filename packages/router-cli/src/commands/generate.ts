import { registerPathConstraints } from '@cookbook/router';
import type { DefineRoutesOptions, RouteDefinition } from '@cookbook/router';
import { generateContracts } from '../generation/generate-contracts';
import { generateManifest, serializeManifest } from '../generation/generate-manifest';
import { generateRegister } from '../generation/generate-register';
import { loadRouteFiles } from '../validation/validate-route-files';
import type { CliFileSystem, CliRouteOptions, CommandResult, RouteFile } from '../contracts';
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
    const routeFile = await resolveRouteInput(options);
    const { outDir, contractsPath, manifestPath, registerPath } = output;

    registerPathConstraints(routeFile.routeOptions?.pathConstraints);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      contractsPath,
      generateContracts(routeFile.routes, routeFile.routeOptions ?? {}),
    );
    await fs.writeFile(
      manifestPath,
      serializeManifest(generateManifest(routeFile.routes, routeFile.routeOptions ?? {})),
    );
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
  const routeFile = await resolveRouteInput(options);
  return routeFile.routes;
}

export async function resolveRouteInput(options: CliRouteOptions): Promise<RouteFile> {
  if (options.routes) {
    return {
      routes: options.routes,
      ...(options.routeOptions === undefined ? {} : { routeOptions: options.routeOptions }),
    };
  }

  if (options.routeFiles?.[0]) {
    const sources = await loadRouteFiles({
      routeFiles: options.routeFiles,
      ...(options.fs === undefined ? {} : { fs: options.fs }),
    });
    const routeOptions = mergeRouteOptions(sources.map((source) => source.routeOptions));

    return {
      routes: sources.flatMap((source) => source.routes),
      ...(routeOptions === undefined ? {} : { routeOptions }),
    };
  }

  throw new Error('No routes or routeFiles were provided.');
}

function mergeRouteOptions(
  routeOptions: readonly (DefineRoutesOptions | undefined)[],
): DefineRoutesOptions | undefined {
  let merged: DefineRoutesOptions | undefined;

  for (const options of routeOptions) {
    if (options === undefined) {
      continue;
    }

    merged = {
      ...(merged?.pathOptions === undefined ? {} : { pathOptions: merged.pathOptions }),
      ...(options.pathOptions === undefined ? {} : { pathOptions: options.pathOptions }),
      pathConstraints: {
        ...(merged?.pathConstraints ?? {}),
        ...(options.pathConstraints ?? {}),
      },
    };
  }

  if (merged?.pathConstraints && !Object.keys(merged.pathConstraints)[0]) {
    return merged.pathOptions === undefined ? undefined : { pathOptions: merged.pathOptions };
  }

  return merged;
}
