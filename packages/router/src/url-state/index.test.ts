import { describe, expect, it } from 'vitest';
import * as url from './index';

describe('url module exports', () => {
  it('exports the URLKit-backed route URL helpers', () => {
    expect(url).not.toHaveProperty('createRouteUrlContractStore');
    expect(url).toMatchObject({
      buildRouteHash: expect.any(Function),
      buildRoutePath: expect.any(Function),
      buildRouteSearch: expect.any(Function),
      createRouteUrlContract: expect.any(Function),
      parseRouteHash: expect.any(Function),
      parseRoutePathParams: expect.any(Function),
      parseRouteSearch: expect.any(Function),
      parseRouteUrlState: expect.any(Function),
      resolveUrlOptions: expect.any(Function),
    });
  });
});
