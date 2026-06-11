import { describe, expect, it } from 'vitest';

describe('package entrypoint', () => {
  it('exports public router primitives and diagnostics', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual([
      'createBrowserHistory',
      'createConstraint',
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
      'createRouteUrlContract',
      'createRouter',
      'createStaticHistory',
      'createStaticRouter',
      'createUnknownRouteError',
      'defineRoutes',
      'deserializeRouterState',
      'flattenRoutes',
      'getConstraint',
      'hasConstraint',
      'matchRoutes',
      'normalizeRoutes',
      'parseHref',
      'rankRoutes',
      'registerPathConstraints',
      'registerUrlPathConstraints',
      'renderRouteMatch',
      'resolveUrlOptions',
      'serializeRouterState',
      'stringifyRouterState',
      'unregisterConstraint',
      'validateRoutes',
    ]);
  });
});
