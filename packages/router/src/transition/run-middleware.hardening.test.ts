import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { defineRoutes } from '../route-config/define-routes';
import { createRouter } from '../runtime/create-router';

describe('run-middleware hardening', () => {
  it('rejects malformed redirect results with a diagnostic error', async () => {
    const routes = defineRoutes([
      { id: 'home', path: '/' },
      { id: 'target', path: '/target' },
    ] as const);
    const router = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      middleware: [() => ({ type: 'redirect', to: '' })],
    });

    const state = await router.navigate.to('target');

    expect(state.navigation).toBe('error');
    expect(String(state.error)).toContain('Middleware redirect target must be a non-empty string');
  });

  it('uses a stable route context for every middleware in the pipeline', async () => {
    const seen: string[] = [];
    const routes = defineRoutes([
      {
        id: 'root',
        path: '/',
        middleware: [
          ({ route }) => {
            seen.push(route.id);
          },
        ],
        children: [{ id: 'child', path: 'child' }],
      },
    ] as const);
    const router = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      middleware: [
        ({ route }) => {
          seen.push(route.id);
        },
      ],
    });

    await router.navigate.to('child');

    expect(seen).toEqual(['child', 'child']);
  });
});
