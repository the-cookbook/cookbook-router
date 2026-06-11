import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { normalizeRoutes } from '../route-config/normalize-routes';
import { matchRoutes } from '../matching/match-routes';
import type { Middleware } from '../route-config/contracts';
import { runMiddleware } from './run-middleware';

function createMatch() {
  const routes = normalizeRoutes([
    {
      id: 'root',
      path: '/',
      children: [
        {
          id: 'users.show',
          path: 'users/{id:int}',
          middleware: [({ cancel }) => cancel()],
        },
      ],
    },
  ]);
  const match = matchRoutes(routes, '/users/1');

  if (!match) {
    throw new Error('Expected test match.');
  }

  return match;
}

describe('run-middleware', () => {
  it('runs global middleware before route middleware and stops on cancel', async () => {
    const calls: string[] = [];
    const middleware: Middleware = () => {
      calls.push('global');
    };

    const result = await runMiddleware({
      middleware: [middleware],
      match: createMatch(),
      location: createMemoryHistory().location,
    });

    expect(result).toEqual({ type: 'cancel' });
    expect(calls).toEqual(['global']);
  });

  it('normalizes false, redirect, rewrite, response, and void results', async () => {
    const match = createMatch();
    const location = createMemoryHistory().location;
    const response = new Response('blocked', { status: 403 });

    await expect(runMiddleware({ middleware: [() => false], match, location })).resolves.toEqual({
      type: 'cancel',
    });
    await expect(
      runMiddleware({ middleware: [({ redirect }) => redirect('/login')], match, location }),
    ).resolves.toEqual({
      type: 'redirect',
      to: '/login',
    });
    await expect(
      runMiddleware({ middleware: [({ rewrite }) => rewrite('/login')], match, location }),
    ).resolves.toEqual({
      type: 'rewrite',
      to: '/login',
    });
    await expect(runMiddleware({ middleware: [() => response], match, location })).resolves.toBe(
      response,
    );
    await expect(
      runMiddleware({ middleware: [() => undefined], match, location }),
    ).resolves.toEqual({ type: 'cancel' });
  });

  it('passes params and location to middleware', async () => {
    const seen: unknown[] = [];
    const match = createMatch();

    await runMiddleware({
      middleware: [
        ({ params, location, route }) => {
          seen.push(params.id, location.href, route.id);
          return { type: 'redirect', to: '/done' };
        },
      ],
      match,
      location: createMemoryHistory({ initialEntries: ['/users/1'] }).location,
    });

    expect(seen).toEqual([1, '/users/1', 'users.show']);
  });
});
