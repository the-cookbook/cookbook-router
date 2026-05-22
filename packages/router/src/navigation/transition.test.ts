import { describe, expect, test } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { normalizeRoutes } from '../matching/normalize-routes';
import { matchRoutes } from '../matching/match-routes';
import { completeTransition, runTransition } from './transition';

describe('transition', () => {
  test('commits successful transitions and completes after hooks', async () => {
    const calls: string[] = [];
    const routes = normalizeRoutes([
      {
        id: 'home',
        path: '/',
        lifecycle: {
          afterEnter: () => {
            calls.push('after');
          },
        },
      },
    ]);
    const to = matchRoutes(routes, '/');
    const location = createMemoryHistory().location;

    await expect(runTransition({ from: null, to, location })).resolves.toEqual({ type: 'commit' });
    await completeTransition({ from: null, to, location });

    expect(calls).toEqual(['after']);
  });

  test('returns blocked, redirect, response, and error states', async () => {
    const routes = normalizeRoutes([{ id: 'home', path: '/' }]);
    const to = matchRoutes(routes, '/');
    const location = createMemoryHistory().location;
    const response = new Response('nope');

    await expect(
      runTransition({ from: null, to, location, lifecycle: { beforeNavigate: () => false } }),
    ).resolves.toEqual({
      type: 'blocked',
    });
    await expect(
      runTransition({
        from: null,
        to,
        location,
        middleware: [({ redirect }) => redirect('/login')],
      }),
    ).resolves.toEqual({
      type: 'redirect',
      to: '/login',
    });
    await expect(
      runTransition({ from: null, to, location, middleware: [() => response] }),
    ).resolves.toBe(response);

    const result = await runTransition({
      from: null,
      to,
      location,
      lifecycle: {
        beforeNavigate: () => {
          throw new Error('bad');
        },
      },
    });
    expect(result.type).toBe('error');
  });

  test('can commit not-found transitions without a match', async () => {
    await expect(
      runTransition({ from: null, to: null, location: createMemoryHistory().location }),
    ).resolves.toEqual({ type: 'commit' });
  });

  test('rethrows after-navigation errors after error handlers run', async () => {
    const calls: string[] = [];
    const location = createMemoryHistory().location;

    await expect(
      completeTransition({
        from: null,
        to: null,
        location,
        lifecycle: {
          afterNavigate: () => {
            throw new Error('after failed');
          },
          onNavigationError: () => {
            calls.push('handled');
          },
        },
      }),
    ).rejects.toThrow('after failed');
    expect(calls).toEqual(['handled']);
  });
});
