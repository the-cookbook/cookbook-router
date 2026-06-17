import { registerPathConstraints } from '@cookbook/router';
import type { CliFileSystem, CliRouteOptions, CliRouteSource, CommandResult } from '../contracts';
import { nodeFileSystem } from '../fs/node-file-system';
import { generateContracts } from './generate-contracts';
import { generateManifest, serializeManifest } from './generate-manifest';
import { generateRegister } from './generate-register';
import { generateRoutesModule } from './generate-routes-module';
import {
  resolveEffectiveRouteOptions,
  resolveRouteInputFromEffectiveOptions,
} from './resolve-route-input';
import { writeGeneratedFile } from './write-generated-file';
import {
  assertGeneratedOutputDoesNotClobberRouteFiles,
  resolveGeneratedOutputPaths,
  resolveGeneratedRoutesPath,
} from '../security/safe-paths';

const defaultFs: CliFileSystem = nodeFileSystem;

export interface GenerateRouterArtifactsOptions extends CliRouteOptions {}

/** Shared generator engine used by CLI commands and build integrations. */
export async function generateRouterArtifacts(
  options: GenerateRouterArtifactsOptions,
): Promise<CommandResult> {
  const effectiveOptions = await resolveEffectiveRouteOptions(options);
  const fs = effectiveOptions.fs ?? defaultFs;
  const output = resolveGeneratedOutputPaths(effectiveOptions.outDir);
  assertGeneratedOutputDoesNotClobberRouteFiles(output, effectiveOptions.routeFiles);
  const routeFile = await resolveRouteInputFromEffectiveOptions(effectiveOptions);
  const { outDir, contractsPath, manifestPath, registerPath } = output;
  const routesPath = resolveGeneratedRoutesPath(output);
  const shouldGenerateRoutesModule = hasGeneratedRoutesModuleSources(routeFile.routeSources);

  registerPathConstraints(routeFile.routeOptions?.pathConstraints);
  await fs.mkdir(outDir, { recursive: true });

  const files = shouldGenerateRoutesModule
    ? [routesPath, contractsPath, manifestPath, registerPath]
    : [contractsPath, manifestPath, registerPath];
  const changedFiles: string[] = [];

  if (shouldGenerateRoutesModule) {
    if (
      await writeGeneratedFile(
        fs,
        routesPath,
        generateRoutesModule(
          routeFile.routeSources ?? [],
          routesPath,
          routeFile.routeOptions ?? {},
          effectiveOptions.runtimeRouteOptions,
        ),
      )
    ) {
      changedFiles.push(routesPath);
    }
  }

  if (
    await writeGeneratedFile(
      fs,
      contractsPath,
      generateContracts(routeFile.routes, routeFile.routeOptions ?? {}),
    )
  ) {
    changedFiles.push(contractsPath);
  }

  if (
    await writeGeneratedFile(
      fs,
      manifestPath,
      serializeManifest(generateManifest(routeFile.routes, routeFile.routeOptions ?? {})),
    )
  ) {
    changedFiles.push(manifestPath);
  }

  if (await writeGeneratedFile(fs, registerPath, generateRegister())) {
    changedFiles.push(registerPath);
  }

  return {
    ok: true,
    files,
    errors: [],
    changedFiles,
  };
}

function hasGeneratedRoutesModuleSources(sources: readonly CliRouteSource[] | undefined): boolean {
  return sources?.some((source) => source.routeExports?.[0] !== undefined) === true;
}
