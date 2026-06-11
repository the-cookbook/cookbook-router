import { renderHook } from '@testing-library/react';
import { describe, expect, it, expectTypeOf } from 'vitest';
import { OutletContext } from '../provider/router-context';
import { useOutletContext } from './use-outlet-context';

describe('useOutletContext', () => {
  it('returns nearest outlet context', () => {
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <OutletContext.Provider value={{ context: { user: 'Ada' } }}>
        {children}
      </OutletContext.Provider>
    );

    const { result } = renderHook(() => useOutletContext<{ user: string }>(), { wrapper });

    expect(result.current.user).toBe('Ada');
  });

  it('throws in strict mode when context is absent', () => {
    expect(() => renderHook(() => useOutletContext('dashboard.home', { strict: true }))).toThrow(
      'Outlet context for route "dashboard.home" was requested in strict mode',
    );
  });

  it('supports route-id inference from contracts', () => {
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <OutletContext.Provider value={{ context: { user: 'Ada' } }}>
        {children}
      </OutletContext.Provider>
    );
    const { result } = renderHook(() => useOutletContext('dashboard.home'), { wrapper });

    expectTypeOf(result.current.user).toEqualTypeOf<string>();
  });
});
