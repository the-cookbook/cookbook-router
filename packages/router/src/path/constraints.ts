import {
  createPathConstraint,
  getPathConstraint,
  hasPathConstraint,
  registerPathConstraints as registerUrlKitPathConstraints,
  resetPathConstraints as resetUrlKitPathConstraints,
  unregisterPathConstraint as unregisterUrlKitPathConstraint,
  type ConstraintValidation,
} from '@cookbook/urlkit/router-runtime';

/**
 * Re-exported URLKit path constraint helpers.
 *
 * Use `createPathConstraint` to author custom constraints, `hasPathConstraint` and
 * `getPathConstraint` for diagnostics, and `unregisterPathConstraint` in tests that need
 * to isolate global constraint registration.
 */
export { createPathConstraint, getPathConstraint, hasPathConstraint };

/** Validation contract for a custom path constraint. */
export type RouterPathConstraint = ConstraintValidation;

/** Custom path constraints keyed by constraint name. */
export type RouterPathConstraints = Readonly<Record<string, RouterPathConstraint>>;

let activePathConstraints: RouterPathConstraints | undefined;

/**
 * Registers custom constraints with URLKit's path registry.
 *
 * Registration is global to the process. Re-registering a different constraint
 * with the same name replaces it for contracts created afterwards; router-owned
 * contract stores re-activate their constraint set before using cached contracts.
 */
export function registerPathConstraints(constraints?: RouterPathConstraints): void {
  if (!constraints || activePathConstraints === constraints) {
    return;
  }

  registerUrlKitPathConstraints(constraints, { overwrite: true });
  activePathConstraints = constraints;
}

export function resetPathConstraints(): void {
  activePathConstraints = undefined;
  resetUrlKitPathConstraints();
}

export function unregisterPathConstraint(
  ...args: Parameters<typeof unregisterUrlKitPathConstraint>
): ReturnType<typeof unregisterUrlKitPathConstraint> {
  activePathConstraints = undefined;
  return unregisterUrlKitPathConstraint(...args);
}
