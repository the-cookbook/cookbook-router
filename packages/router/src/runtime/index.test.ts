import { describe, expect, it } from 'vitest';
import * as runtime from './index';

describe('runtime public module', () => {
  it('re-exports router factories, state serializers, and meta helpers', () => {
    expect(runtime).toMatchObject({
      createMemoryRouter: expect.any(Function),
      createRouter: expect.any(Function),
      createStaticRouter: expect.any(Function),
      deserializeRouterState: expect.any(Function),
      getActiveRouteMetaChain: expect.any(Function),
      getRouteMeta: expect.any(Function),
      getRouteMetaChain: expect.any(Function),
      mergeRouteMetaChain: expect.any(Function),
      serializeRouterState: expect.any(Function),
      stringifyRouterState: expect.any(Function),
    });
  });
});
