import { describe, expect, it } from 'vitest';
import * as diagnostics from './index';

describe('diagnostics public module', () => {
  it('re-exports public router diagnostic factories', () => {
    expect(diagnostics).toMatchObject({
      createGeneratedHrefMismatchError: expect.any(Function),
      createHydrationMismatchError: expect.any(Function),
      createInvalidParamError: expect.any(Function),
      createMalformedRedirectError: expect.any(Function),
      createMissingOutletContextError: expect.any(Function),
      createMissingParamError: expect.any(Function),
      createMissingPathError: expect.any(Function),
      createMissingProviderError: expect.any(Function),
      createUnknownRouteError: expect.any(Function),
    });
  });
});
