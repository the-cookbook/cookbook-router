import { describe, expect, it } from 'vitest';
import {
  extractBalancedArray,
  extractBalancedObject,
  readObjectPropertyKey,
  readPropertyValue,
  skipTrivia,
} from './static-source-scanner';

describe('static source scanner', () => {
  it('extracts balanced arrays and objects while preserving nested values', () => {
    expect(
      extractBalancedArray(
        'routes.ts',
        'const routes = [{ id: "home", meta: { nested: true } }];',
        15,
      ),
    ).toBe('[{ id: "home", meta: { nested: true } }]');
    expect(extractBalancedObject('options', '{ pathOptions: { strict: true } }', 0)).toBe(
      '{ pathOptions: { strict: true } }',
    );
  });

  it('reads static property keys and values', () => {
    const source = 'slug: createConstraint({ toRegExp() { return "[^/]+"; } }), next: true';
    const key = readObjectPropertyKey(source, 0);
    expect(key).toEqual({ name: 'slug', end: 4 });
    expect(source.slice(6, readPropertyValue(source, 6))).toContain('createConstraint');
  });

  it('skips comments and whitespace', () => {
    expect(skipTrivia('  // comment\n  value', 0)).toBe(15);
  });
});
