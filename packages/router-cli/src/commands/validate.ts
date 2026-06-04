import { registerUrlPathConstraints, validateRoutes } from '@cookbook/router';
import { resolveRouteInput } from './generate';
import type { CliRouteOptions, CommandResult } from '../contracts';

/** Options for validating routes without writing generated artifacts. */
export interface ValidateOptions extends CliRouteOptions {}

/** Validates route files and route options, including custom path constraints. */
export async function validateCommand(options: ValidateOptions): Promise<CommandResult> {
  try {
    const routeFile = await resolveRouteInput(options);
    registerUrlPathConstraints(routeFile.routeOptions?.pathConstraints);
    validateRoutes(routeFile.routes, routeFile.routeOptions?.pathOptions);

    return { ok: true, files: [], errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
