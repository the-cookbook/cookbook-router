import type { ComponentType } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OutletProps, SlotErrorFallback, SlotErrorFallbackProps, SlotProps } from './index';

describe('outlets entrypoint', () => {
  it('exports the complete public outlet surface without unrelated values', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual(['Outlet', 'Slot']);
  });

  it('exports every public outlet and slot type', () => {
    expectTypeOf<OutletProps<{ readonly userId: number }>>().toHaveProperty('context');
    expectTypeOf<OutletProps>().toHaveProperty('children');
    expectTypeOf<SlotProps<{ readonly source: string }>>().toHaveProperty('name');
    expectTypeOf<SlotProps>().toHaveProperty('context');
    expectTypeOf<SlotProps>().toHaveProperty('errorFallback');
    expectTypeOf<SlotErrorFallbackProps>().toEqualTypeOf<{
      readonly error: unknown;
      readonly reset: () => void;
    }>();
    expectTypeOf<SlotErrorFallback>().toEqualTypeOf<ComponentType<SlotErrorFallbackProps> | null>();
  });
});
