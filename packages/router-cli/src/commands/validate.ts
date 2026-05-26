import { registerPathConstraints, validateRoutes } from '@cookbook/router';
import { resolveRouteInput } from './generate';
import type { CliRouteOptions, CommandResult } from '../contracts';

export interface ValidateOptions extends CliRouteOptions {}

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
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
