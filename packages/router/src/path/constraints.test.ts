import { afterEach, describe, expect, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import {
  createPathConstraint,
  getPathConstraint,
  hasPathConstraint,
  registerPathConstraints,
  unregisterPathConstraint,
} from './constraints';

afterEach(() => {
  resetConstraints();
});

describe('path constraints', () => {
  it('registers custom path constraints and exposes registry helpers', () => {
    const slug = createPathConstraint({
      parse(_name, value) {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error('Invalid slug.');
        }
      },
      verify() {},
      toRegExp() {
        return '[a-z0-9-]+';
      },
    });

    registerPathConstraints({ slug });

    expect(hasPathConstraint('slug')).toBe(true);
    expect(getPathConstraint('slug')).toBe(slug);

    unregisterPathConstraint('slug');
    expect(hasPathConstraint('slug')).toBe(false);
  });

  it('rejects empty custom constraint names', () => {
    const slug = createPathConstraint({ parse() {}, verify() {}, toRegExp: () => '[a-z]+' });

    expect(() => registerPathConstraints({ ' ': slug })).toThrow(
      'Router path constraint names must be non-empty strings.',
    );
  });
});
