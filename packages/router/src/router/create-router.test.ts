import { describe, expect, test } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { defineRoutes } from '../routes/define-routes';
import { createRouter, deserializeRouterState, serializeRouterState } from './create-router';

const routes = defineRoutes([
  { id: 'home', path: '/' },
  { id: 'about', path: '/about' },
] as const);

describe('create-router', () => {
  test('uses provided history and exposes resolve helpers', async () => {
    const history = createMemoryHistory({ initialEntries: ['/about'] });
    const router = createRouter({ routes, history });

    expect(router.state.match?.route.id).toBe('about');
    expect(router.resolve('home').href).toBe('/');
    expect(router.href({ route: 'about' })).toBe('/about');
    expect(router.href('about', { context: { source: 'ignored' } })).toBe('/about');
    expect(router.match('/about')?.route.id).toBe('about');

    await router.navigate.to({ route: 'about' });
    expect(router.state.location.href).toBe('/about');

    const serialized = serializeRouterState(router);
    expect(deserializeRouterState(serialized)).toEqual(serialized);
  });
});
