import { registerPathConstraints, validateRoutes } from '@cookbook/router';
import { resolveRouteInput } from '../generation/resolve-route-input';
import type { CliRouteOptions, CommandResult } from '../contracts';
import { formatCommandError } from './format-command-error';

/** Options for validating routes without writing generated artifacts. */
export interface ValidateOptions extends CliRouteOptions {}

/** Validates route files and route options, including custom path constraints. */
export async function validateCommand(options: ValidateOptions): Promise<CommandResult> {
  try {
    const routeFile = await resolveRouteInput(options);
    registerPathConstraints(routeFile.routeOptions?.pathConstraints);
    validateRoutes(routeFile.routes, routeFile.routeOptions?.pathOptions);

    return { ok: true, files: [], errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [formatCommandError(error, options.verbose)],
    };
  }
}
