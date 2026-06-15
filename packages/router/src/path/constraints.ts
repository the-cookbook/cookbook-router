import {
  createConstraint as createPathConstraint,
  getConstraint as getPathConstraint,
  hasConstraint as hasPathConstraint,
  unregisterConstraint as unregisterPathConstraint,
  registerConstraint,
} from '@cookbook/pathkit';
import type { ConstraintValidation } from '@cookbook/pathkit';

/**
 * Re-exported path constraint helpers from `@cookbook/pathkit`.
 *
 * Use `createPathConstraint` to author custom constraints, `hasPathConstraint` and
 * `getPathConstraint` for diagnostics, and `unregisterPathConstraint` in tests that need
 * to isolate global constraint registration.
 */
export { createPathConstraint, getPathConstraint, hasPathConstraint, unregisterPathConstraint };

/**
 * Validation contract for a custom path constraint.
 */
export type RouterPathConstraint = ConstraintValidation;

/**
 * Custom path constraints keyed by constraint name.
 */
export type RouterPathConstraints = Readonly<Record<string, RouterPathConstraint>>;

export interface PathConstraintRegistry {
  readonly clearCaches: () => void;
}

let registry: PathConstraintRegistry | null = null;

export function setPathConstraintRegistry(next: PathConstraintRegistry | null): void {
  registry = next;
}

/**
 * Registers custom constraints with the underlying pathkit registry.
 *
 * Registration is global to the process, so tests that define temporary
 * constraints should unregister or isolate names. Caches are cleared after
 * registration so validation, matching, and compilation see the new behavior.
 */
export function registerPathConstraints(constraints?: RouterPathConstraints): void {
  if (!constraints) {
    return;
  }

  for (const [name, constraint] of Object.entries(constraints)) {
    if (!name.trim()) {
      throw new Error('Router path constraint names must be non-empty strings.');
    }

    registerConstraint(name, constraint);
  }

  registry?.clearCaches();
}
