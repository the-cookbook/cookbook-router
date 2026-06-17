import { registerPathConstraints } from '@cookbook/router';
import { generateManifest, serializeManifest } from '../generation/generate-manifest';
import { writeGeneratedFile } from '../generation/write-generated-file';
import { resolveRouteInputWithOptions } from '../generation/resolve-route-input';
import type { CliFileSystem, CliRouteOptions, CommandResult } from '../contracts';
import {
  assertGeneratedOutputDoesNotClobberRouteFiles,
  resolveGeneratedOutputPaths,
} from '../security/safe-paths';
import { nodeFileSystem } from '../fs/node-file-system';
import { formatCommandError } from './format-command-error';

const defaultFs: CliFileSystem = nodeFileSystem;

/** Options for generating only the route manifest artifact. */
export interface ManifestOptions extends CliRouteOptions {}

/** Generates `manifest.json` for a route tree without writing type contracts. */
export async function manifestCommand(options: ManifestOptions): Promise<CommandResult> {
  try {
    const { routeFile, options: effectiveOptions } = await resolveRouteInputWithOptions(options);
    const fs = effectiveOptions.fs ?? defaultFs;
    const output = resolveGeneratedOutputPaths(effectiveOptions.outDir);
    assertGeneratedOutputDoesNotClobberRouteFiles(output, effectiveOptions.routeFiles);
    const { outDir, manifestPath } = output;

    registerPathConstraints(routeFile.routeOptions?.pathConstraints);
    await fs.mkdir(outDir, { recursive: true });
    const changed = await writeGeneratedFile(
      fs,
      manifestPath,
      serializeManifest(generateManifest(routeFile.routes, routeFile.routeOptions ?? {})),
    );

    return {
      ok: true,
      files: [manifestPath],
      errors: [],
      changedFiles: changed ? [manifestPath] : [],
    };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [formatCommandError(error, options.verbose)],
    };
  }
}
