import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useBlocker } from './use-blocker';

describe('useBlocker', () => {
  test('returns blocked state from the when flag', () => {
    const { result } = renderHook(() => useBlocker({ when: true, message: 'Stop' }));

    expect(result.current.blocked).toBe(true);
  });

  test('registers and cleans beforeunload listener only when enabled', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useBlocker({ when: true }));

    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
