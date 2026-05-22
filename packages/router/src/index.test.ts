import { describe, expect, test } from 'vitest';

describe('package entrypoint', () => {
  test('exports public router primitives and diagnostics', async () => {
    const module = await import('./index');

    expect(Object.keys(module).sort()).toEqual([
      'completeTransition',
      'createBrowserHistory',
      'createGeneratedHrefMismatchError',
      'createHydrationMismatchError',
      'createInterceptHistoryState',
      'createInvalidParamError',
      'createMalformedRedirectError',
      'createMemoryHistory',
      'createMemoryRouter',
      'createMissingOutletContextError',
      'createMissingParamError',
      'createMissingPathError',
      'createMissingProviderError',
      'createRouter',
      'createStaticHistory',
      'createStaticRouter',
      'createUnknownRouteError',
      'defineRoutes',
      'deserializeRouterState',
      'flattenRoutes',
      'getResolvedSlot',
      'matchRoutes',
      'normalizeCallSiteIntercept',
      'normalizeConfiguredIntercepts',
      'normalizeRoutes',
      'parseHref',
      'rankRoutes',
      'resolveIntercept',
      'resolveSlots',
      'restoreInterceptFromState',
      'runAfterNavigate',
      'runBeforeNavigate',
      'runMiddleware',
      'runNavigationError',
      'runTransition',
      'serializeRouterState',
      'stringifyRouterState',
      'validateInterceptTargets',
      'validateRoutes',
    ]);
  });
});
