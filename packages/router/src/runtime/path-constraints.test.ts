import { describe, expect, it } from 'vitest';
import { createConstraint } from '../path';
import { mergePathConstraints } from './path-constraints';

describe('mergePathConstraints', () => {
  const left = createConstraint({ parse() {}, verify() {}, toRegExp: () => '[a-z]+' });
  const right = createConstraint({ parse() {}, verify() {}, toRegExp: () => '[a-z0-9]+' });
  const uuid = createConstraint({ parse() {}, verify() {}, toRegExp: () => '[a-f0-9-]+' });

  it('returns either side when only one side is defined', () => {
    const constraints = { slug: left };
    expect(mergePathConstraints(undefined, constraints)).toBe(constraints);
    expect(mergePathConstraints(constraints, undefined)).toBe(constraints);
  });

  it('merges both sides with the right side taking priority', () => {
    expect(mergePathConstraints({ slug: left }, { slug: right, uuid })).toEqual({
      slug: right,
      uuid,
    });
  });
});
