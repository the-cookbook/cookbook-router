import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { defineRoutes } from '../route-config/define-routes';
import { createRouterRuntime } from './create-router-runtime';

describe('createRouterRuntime', () => {
  it('creates a router from an explicit history implementation', () => {
    const router = createRouterRuntime({
      routes: defineRoutes([{ id: 'home', path: '/' }] as const),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    expect(router.state.location.href).toBe('/');
    expect(router.state.match?.id).toBe('home');
  });
});
