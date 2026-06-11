import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultHistory } from './default-history';

describe('createDefaultHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates memory history outside a browser environment', () => {
    vi.stubGlobal('window', undefined);
    const history = createDefaultHistory('/initial');
    expect(history.mode).toBe('memory');
    expect(history.location.href).toBe('/initial');
  });
});
