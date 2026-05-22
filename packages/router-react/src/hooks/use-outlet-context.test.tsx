import { renderHook } from '@testing-library/react';
import { describe, expect, test, expectTypeOf } from 'vitest';
import { OutletContext } from '../context/router-context';
import { useOutletContext } from './use-outlet-context';

describe('useOutletContext', () => {
  test('returns nearest outlet context', () => {
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <OutletContext.Provider value={{ outlet: null, context: { user: 'Ada' } }}>
        {children}
      </OutletContext.Provider>
    );

    const { result } = renderHook(() => useOutletContext<{ user: string }>(), { wrapper });

    expect(result.current.user).toBe('Ada');
  });

  test('throws in strict mode when context is absent', () => {
    expect(() => renderHook(() => useOutletContext('dashboard.home', { strict: true }))).toThrow(
      'Outlet context for route "dashboard.home" was requested in strict mode',
    );
  });

  test('supports route-id inference from contracts', () => {
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <OutletContext.Provider value={{ outlet: null, context: { user: 'Ada' } }}>
        {children}
      </OutletContext.Provider>
    );
    const { result } = renderHook(() => useOutletContext('dashboard.home'), { wrapper });

    expectTypeOf(result.current.user).toEqualTypeOf<string>();
  });
});
