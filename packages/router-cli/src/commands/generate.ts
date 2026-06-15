import type { CliRouteOptions, CommandResult } from '../contracts';
import {
  generateRouterArtifacts,
  type GenerateRouterArtifactsOptions,
} from '../generation/generate-router-artifacts';
import { formatCommandError } from './format-command-error';
export { resolveRouteInput, resolveRoutes } from '../generation/resolve-route-input';

/** Options for generating routes, contracts, register declarations, and manifest JSON. */
export interface GenerateOptions extends CliRouteOptions {}

/**
 * Generates `routes.ts`, `contracts.ts`, `register.d.ts`, and `manifest.json`.
 */
export async function generateCommand(options: GenerateOptions): Promise<CommandResult> {
  try {
    return await generateRouterArtifacts(options as GenerateRouterArtifactsOptions);
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [formatCommandError(error, options.verbose)],
    };
  }
}
