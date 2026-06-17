import { describe, expect, it } from 'vitest';

describe('package entrypoint', () => {
  it('exports public router primitives and diagnostics', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual([
      'createBrowserHistory',
      'createGeneratedHrefMismatchError',
      'createHydrationMismatchError',
      'createInvalidParamError',
      'createMalformedRedirectError',
      'createMemoryHistory',
      'createMemoryRouter',
      'createMissingOutletContextError',
      'createMissingParamError',
      'createMissingPathError',
      'createMissingProviderError',
      'createPathConstraint',
      'createRouteUrlContract',
      'createRouter',
      'createStaticHistory',
      'createStaticRouter',
      'createUnknownRouteError',
      'defineHash',
      'defineRoute',
      'defineRouteTree',
      'defineRoutes',
      'defineSearch',
      'deserializeRouterState',
      'flattenRoutes',
      'getActiveRouteMetaChain',
      'getPathConstraint',
      'getRouteMeta',
      'getRouteMetaChain',
      'hasPathConstraint',
      'matchRoutes',
      'mergeRouteMetaChain',
      'mergeSearch',
      'normalizeRoutes',
      'parseHref',
      'rankRoutes',
      'registerPathConstraints',
      'renderRouteMatch',
      'resolveUrlOptions',
      'serializeRouterState',
      'stringifyRouterState',
      'unregisterPathConstraint',
      'validateResolvedRouteTree',
      'validateRoutes',
    ]);
  });
});
