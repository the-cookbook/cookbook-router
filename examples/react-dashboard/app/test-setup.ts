import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

if (!globalThis.PointerEvent) {
  Object.defineProperty(globalThis, 'PointerEvent', {
    writable: true,
    value: MouseEvent,
  });
}

Element.prototype.scrollIntoView = vi.fn();
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});
HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  value: 48,
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  value: 128,
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = '';
});
