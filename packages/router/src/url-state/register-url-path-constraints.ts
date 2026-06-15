import { registerPathConstraints as registerPathkitPathConstraints } from '../path';
import type { RouterPathConstraints } from '../path';

/**
 * Registers custom path constraints with the router's PathKit registry.
 *
 * URLKit route contracts receive the same constraints per contract through
 * `createRouteUrlContract({ ... }, { pathConstraints })`, so this helper does
 * not depend on URLKit's global registration API.
 */
export function registerUrlPathConstraints(constraints?: RouterPathConstraints): void {
  if (!constraints) {
    return;
  }

  registerPathkitPathConstraints(constraints);
}
