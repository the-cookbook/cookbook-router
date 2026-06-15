import { describe, expect, it } from 'vitest';
import type { RouterPathConstraint } from '@cookbook/router';
import { defineRouterConfig } from './define-router-config';

const pathConstraint: RouterPathConstraint = Object.assign(
  (_paramName: string, _value: string | number | boolean | undefined, _params: string) => {},
  {
    verify(_paramName: string, _params: string) {},
    toRegExp(_params: string) {
      return '[^/]+';
    },
  },
);

describe('defineRouterConfig', () => {
  it('returns the provided config object unchanged', () => {
    const config = {
      routeFiles: ['src/**/*.route.tsx', 'routes.ts'],
      outDir: '.generated/router',
      pathOptions: { prune: 'all' },
    } as const;

    expect(defineRouterConfig(config)).toBe(config);
  });

  it.each([
    ['routeFiles omitted', {}],
    ['routeFiles as string', { routeFiles: 'src/**/*.route.tsx' }],
    [
      'routeFiles as array with at least 2 strings',
      { routeFiles: ['src/**/*.route.tsx', 'routes.ts'] },
    ],
    ['outDir as string', { outDir: '.generated/router' }],
    ['prune all', { pathOptions: { prune: 'all' } }],
    ['prune duplication', { pathOptions: { prune: 'duplication' } }],
    ['prune trailing', { pathOptions: { prune: 'trailing' } }],
    ['prune false', { pathOptions: { prune: false } }],
    ['pathOptions omitted values', { pathOptions: {} }],
    ['pathConstraints omitted values', { pathConstraints: {} }],
    ['pathConstraints with constraint', { pathConstraints: { id: pathConstraint } }],
  ] as const)('accepts valid config: %s', (_name, config) => {
    expect(defineRouterConfig(config)).toBe(config);
  });

  it.each([
    ['unknown root property', { unknown: true }],
    ['routeFiles as number', { routeFiles: 123 }],
    ['routeFiles as empty array', { routeFiles: [] }],
    ['routeFiles as single-item array', { routeFiles: ['src/**/*.route.tsx'] }],
    ['routeFiles array with non-string item', { routeFiles: ['src/**/*.route.tsx', 123] }],
    ['routeFiles array with duplicate items', { routeFiles: ['routes.ts', 'routes.ts'] }],
    ['outDir as number', { outDir: 123 }],
    ['pathOptions as boolean', { pathOptions: true }],
    ['pathOptions with unknown property', { pathOptions: { unknown: true } }],
    ['prune as unknown string', { pathOptions: { prune: 'none' } }],
    ['prune as null', { pathOptions: { prune: null } }],
    ['pathConstraints as array', { pathConstraints: [] }],
    ['pathConstraint as plain function', { pathConstraints: { id: () => {} } }],
    [
      'pathConstraint missing toRegExp',
      { pathConstraints: { id: Object.assign(() => {}, { verify() {} }) } },
    ],
    [
      'pathConstraint missing verify',
      { pathConstraints: { id: Object.assign(() => {}, { toRegExp: () => '[^/]+' }) } },
    ],
    [
      'pathConstraint as plain object',
      { pathConstraints: { id: { verify() {}, toRegExp: () => '[^/]+' } } },
    ],
  ])('rejects invalid config: %s', (_name, config) => {
    expect(() => defineRouterConfig(config as never)).toThrow();
  });
});
