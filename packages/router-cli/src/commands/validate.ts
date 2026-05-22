import { validateRoutes } from '@cookbook/router';
import { resolveRoutes } from './generate';
import type { CliRouteOptions, CommandResult } from '../contracts';

export interface ValidateOptions extends CliRouteOptions {}

export async function validateCommand(options: ValidateOptions): Promise<CommandResult> {
  try {
    const routes = await resolveRoutes(options);
    validateRoutes(routes);

    return { ok: true, files: [], errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
