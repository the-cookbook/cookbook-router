import type { RouterLocation } from '../history/memory-history';

export function isHydrationPathSearchMatch(
  serverLocation: RouterLocation,
  clientLocation: RouterLocation,
): boolean {
  return (
    serverLocation.pathname === clientLocation.pathname &&
    serverLocation.search === clientLocation.search
  );
}

export function scheduleMacrotask(callback: () => void): void {
  if (typeof globalThis.setTimeout === 'function') {
    globalThis.setTimeout(callback, 0);
    return;
  }

  callback();
}
