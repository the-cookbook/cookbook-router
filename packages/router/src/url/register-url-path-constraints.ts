import {
  createRouteUrlContract as createUrlKitRouteUrlContract,
  registerPathConstraints as registerUrlKitPathConstraints,
  type ConstraintValidation,
} from '@cookbook/urlkit/router-runtime';
import {
  registerPathConstraints as registerPathkitPathConstraints,
  type RouterPathConstraints,
} from '../pathkit/pathkit';

/**
 * Registers custom path constraints with both the router's current PathKit
 * registry and URLKit's router runtime registry.
 *
 * This is the single registration path for URL-aware router workflows while the
 * router migrates matching and href generation from direct PathKit calls to
 * URLKit contracts.
 */
export function registerUrlPathConstraints(constraints?: RouterPathConstraints): void {
  ensureUrlKitBuiltInPathConstraints();

  if (!constraints) {
    return;
  }

  registerPathkitPathConstraints(constraints);
  registerUrlKitPathConstraints(toUrlKitPathConstraints(constraints), { overwrite: true });
}

function ensureUrlKitBuiltInPathConstraints(): void {
  createUrlKitRouteUrlContract(
    { path: '/__cookbook_urlkit/{value:number}' },
    {
      params: 'parsed',
    },
  );
}

function toUrlKitPathConstraints(
  constraints: RouterPathConstraints,
): Record<string, ConstraintValidation> {
  return constraints;
}
