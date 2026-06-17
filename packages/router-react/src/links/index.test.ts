import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  LinkPrefetch,
  LinkProps,
  NavLinkEnd,
  NavLinkEndOptions,
  NavLinkProps,
  NavLinkRenderProps,
} from './index';

describe('links entrypoint', () => {
  it('exports the complete public link surface without unrelated values', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual([
      'Link',
      'NavLink',
      'shouldPreserveBrowserBehavior',
    ]);
  });

  it('exports every public link type', () => {
    expectTypeOf<LinkPrefetch>().toEqualTypeOf<
      false | 'hover' | 'focus' | 'interaction' | 'mount'
    >();
    expectTypeOf<LinkProps>().toHaveProperty('to');
    expectTypeOf<LinkProps>().toHaveProperty('href');
    expectTypeOf<LinkProps>().toHaveProperty('prefetch');
    expectTypeOf<NavLinkProps>().toHaveProperty('end');
    expectTypeOf<NavLinkProps>().toHaveProperty('intercept');
    expectTypeOf<NavLinkRenderProps>().toEqualTypeOf<{ readonly isActive: boolean }>();
    expectTypeOf<NavLinkEndOptions>().toEqualTypeOf<{
      readonly search?: 'all' | 'ignore';
    }>();
    expectTypeOf<NavLinkEnd>().toEqualTypeOf<boolean | NavLinkEndOptions>();
  });
});
