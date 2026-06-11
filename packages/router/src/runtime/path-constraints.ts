import type { RouterPathConstraints } from '../path';

export function mergePathConstraints(
  left?: RouterPathConstraints,
  right?: RouterPathConstraints,
): RouterPathConstraints | undefined {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return { ...left, ...right };
}
