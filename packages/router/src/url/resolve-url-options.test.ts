import { describe, expect, it } from 'vitest';
import { resolveUrlOptions } from './resolve-url-options';

describe('resolveUrlOptions', () => {
  it('uses URLKit defaults when no router, route, or call options are provided', () => {
    expect(resolveUrlOptions()).toEqual({});
  });

  it('lets route-level URL options override router-level URL options', () => {
    expect(
      resolveUrlOptions({
        router: { arrayFormat: 'repeat' },
        route: { arrayFormat: 'comma' },
      }),
    ).toEqual({ arrayFormat: 'comma' });
  });

  it('lets per-call URL options override route-level URL options', () => {
    expect(
      resolveUrlOptions({
        router: { arrayFormat: 'repeat' },
        route: { arrayFormat: 'comma' },
        call: { arrayFormat: 'repeat' },
      }),
    ).toEqual({ arrayFormat: 'repeat' });
  });

  it('resolves invalidSearch with the same precedence model', () => {
    expect(
      resolveUrlOptions({
        router: { invalidSearch: 'error' },
        route: { invalidSearch: 'no-match' },
        call: { invalidSearch: 'recover' },
      }),
    ).toEqual({ invalidSearch: 'recover' });
  });

  it('resolves unknownSearch with the same precedence model', () => {
    expect(
      resolveUrlOptions({
        router: { unknownSearch: 'strip' },
        route: { unknownSearch: 'preserve' },
        call: { unknownSearch: 'error' },
      }),
    ).toEqual({ unknownSearch: 'error' });
  });
});
