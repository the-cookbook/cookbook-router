import { generateManifest, serializeManifest } from '../generation/generate-manifest';
import { resolveRoutes } from './generate';
import type { CliFileSystem, CliRouteOptions, CommandResult } from '../contracts';
import {
  assertGeneratedOutputDoesNotClobberRouteFiles,
  resolveGeneratedOutputPaths,
} from '../security/safe-paths';
import { nodeFileSystem } from '../node-file-system';

const defaultFs: CliFileSystem = nodeFileSystem;

export interface ManifestOptions extends CliRouteOptions {}

export async function manifestCommand(options: ManifestOptions): Promise<CommandResult> {
  try {
    const fs = options.fs ?? defaultFs;
    const output = resolveGeneratedOutputPaths(options.outDir);
    assertGeneratedOutputDoesNotClobberRouteFiles(output, options.routeFiles);
    const routes = await resolveRoutes(options);
    const { outDir, manifestPath } = output;

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(manifestPath, serializeManifest(generateManifest(routes)));

    return { ok: true, files: [manifestPath], errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
