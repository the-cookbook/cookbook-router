import { describe, expect, it } from 'vitest';
import type { RouterUrlOptions } from './contracts';

describe('URL contract types', () => {
  it('keeps router URL options as a namespaced object shape', () => {
    const options: RouterUrlOptions = {
      arrayFormat: 'comma',
      invalidSearch: 'recover',
      invalidHash: 'error',
      unknownSearch: 'preserve',
    };

    expect(options).toEqual({
      arrayFormat: 'comma',
      invalidSearch: 'recover',
      invalidHash: 'error',
      unknownSearch: 'preserve',
    });
  });
});
