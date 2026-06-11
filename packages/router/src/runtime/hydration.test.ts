import { describe, expect, it, vi } from 'vitest';
import { parseHref } from '../history/memory-history';
import { isHydrationPathSearchMatch, scheduleMacrotask } from './hydration';

describe('hydration helpers', () => {
  it('matches hydration locations by pathname and search only', () => {
    expect(isHydrationPathSearchMatch(parseHref('/a?x=1#server'), parseHref('/a?x=1#client'))).toBe(
      true,
    );
    expect(isHydrationPathSearchMatch(parseHref('/a?x=1'), parseHref('/a?x=2'))).toBe(false);
  });

  it('schedules callbacks on a macrotask when timers exist', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    scheduleMacrotask(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
