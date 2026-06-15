import { describe, expect, it } from 'vitest';
import { resolveLinkHrefOptions } from './resolve-link-href';

describe('resolveLinkHrefOptions', () => {
  it('omits undefined fields and preserves URL options', () => {
    expect(
      resolveLinkHrefOptions({
        params: { id: 1 },
        search: { tags: ['router'] },
        hash: 'top',
        url: { arrayFormat: 'comma' },
        preventScrollReset: true,
        intercept: false,
      }),
    ).toEqual({
      params: { id: 1 },
      search: { tags: ['router'] },
      hash: 'top',
      url: { arrayFormat: 'comma' },
      preventScrollReset: true,
      intercept: false,
    });
  });
});
