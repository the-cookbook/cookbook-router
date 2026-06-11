import { describe, expect, it } from 'vitest';
import { matchRoutes } from '../matching/match-routes';
import { normalizeRoutes } from '../route-config/normalize-routes';
import { resolveBoundaryFallbacks, resolveLayoutFallbacks } from './resolve-view-fallbacks';

const routes = normalizeRoutes([
  {
    id: 'root',
    path: '/',
    layout: { view: 'root-layout', loading: 'layout-loading', error: 'layout-error' },
    children: [
      {
        id: 'home',
        index: true,
        view: 'home-view',
        loading: 'home-loading',
        error: 'home-error',
      },
    ],
  },
] as const);

describe('resolve-view-fallbacks', () => {
  it('inherits layout fallbacks and lets leaf routes override boundary fallbacks', () => {
    const match = matchRoutes(routes, '/');
    const root = match?.branch[0];
    const home = match?.branch[1];

    if (!root || !home) {
      throw new Error('Expected root and home matches.');
    }

    const rootLayoutFallbacks = resolveLayoutFallbacks(root, {});
    expect(rootLayoutFallbacks.loading?.view).toBe('layout-loading');
    expect(rootLayoutFallbacks.error?.view).toBe('layout-error');

    const homeBoundaryFallbacks = resolveBoundaryFallbacks(home, rootLayoutFallbacks, true);
    expect(homeBoundaryFallbacks.loading?.view).toBe('home-loading');
    expect(homeBoundaryFallbacks.error?.view).toBe('home-error');
  });
});
