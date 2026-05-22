import { describe, expect, test } from 'vitest';
import { validatePathPattern } from './pathkit';

describe('pathkit hardening', () => {
  test('delegates duplicate parameter rejection to @cookbook/pathkit', () => {
    expect(() => validatePathPattern('/users/{id:int}/posts/{id:int}')).toThrow(
      'Duplicate parameter',
    );
  });

  test('delegates duplicate wildcard and regular parameter rejection to @cookbook/pathkit', () => {
    expect(() => validatePathPattern('/files/{path}/{*path}')).toThrow('Duplicate parameter');
  });
});
