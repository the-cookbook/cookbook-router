import type { ResolveUrlOptionsInput, RouterUrlOptions } from './contracts';

/**
 * Resolves URLKit options using router precedence:
 * per-call/hook/component, then route-level, then router-level, then URLKit's
 * own default behavior for omitted fields.
 */
export function resolveUrlOptions(options: ResolveUrlOptionsInput = {}): RouterUrlOptions {
  return {
    ...options.router,
    ...options.route,
    ...options.call,
  };
}
