import { registerUrlPathConstraints } from '@cookbook/router';
import { generateManifest, serializeManifest } from '../generation/generate-manifest';
import { resolveRouteInput } from './generate';
import type { CliFileSystem, CliRouteOptions, CommandResult } from '../contracts';
import {
  assertGeneratedOutputDoesNotClobberRouteFiles,
  resolveGeneratedOutputPaths,
} from '../security/safe-paths';
import { nodeFileSystem } from '../fs/node-file-system';

const defaultFs: CliFileSystem = nodeFileSystem;

/** Options for generating only the route manifest artifact. */
export interface ManifestOptions extends CliRouteOptions {}

/** Generates `manifest.json` for a route tree without writing type contracts. */
export async function manifestCommand(options: ManifestOptions): Promise<CommandResult> {
  try {
    const fs = options.fs ?? defaultFs;
    const output = resolveGeneratedOutputPaths(options.outDir);
    assertGeneratedOutputDoesNotClobberRouteFiles(output, options.routeFiles);
    const routeFile = await resolveRouteInput(options);
    const { outDir, manifestPath } = output;

    registerUrlPathConstraints(routeFile.routeOptions?.pathConstraints);
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      manifestPath,
      serializeManifest(generateManifest(routeFile.routes, routeFile.routeOptions ?? {})),
    );

    return { ok: true, files: [manifestPath], errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
