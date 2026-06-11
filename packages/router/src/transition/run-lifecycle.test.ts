import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { normalizeRoutes } from '../route-config/normalize-routes';
import { matchRoutes } from '../matching/match-routes';
import type { GlobalLifecycle } from '../route-config/contracts';
import { runAfterNavigate, runBeforeNavigate, runNavigationError } from './run-lifecycle';

function createMatches() {
  const calls: string[] = [];
  const routes = normalizeRoutes([
    {
      id: 'root',
      path: '/',
      lifecycle: {
        beforeLeave: () => {
          calls.push('leave-root');
        },
      },
      children: [
        {
          id: 'home',
          index: true,
        },
        {
          id: 'users.show',
          path: 'users/{id:int}',
          lifecycle: {
            beforeEnter: () => {
              calls.push('enter-user');
            },
            afterEnter: () => {
              calls.push('after-user');
            },
            onError: () => {
              calls.push('error-user');
            },
          },
        },
      ],
    },
  ]);

  return {
    calls,
    from: matchRoutes(routes, '/'),
    to: matchRoutes(routes, '/users/1'),
    location: createMemoryHistory({ initialEntries: ['/users/1'] }).location,
  };
}

describe('run-lifecycle', () => {
  it('runs global before, route leave, route enter, and after hooks in order', async () => {
    const data = createMatches();
    const lifecycle: GlobalLifecycle = {
      beforeNavigate: () => {
        data.calls.push('before-global');
      },
      afterNavigate: () => {
        data.calls.push('after-global');
      },
    };

    await expect(runBeforeNavigate({ ...data, lifecycle })).resolves.toBe(true);
    await runAfterNavigate({ ...data, lifecycle });

    expect(data.calls).toEqual([
      'before-global',
      'leave-root',
      'enter-user',
      'after-user',
      'after-global',
    ]);
  });

  it('blocks when global, beforeLeave, or beforeEnter returns false', async () => {
    const data = createMatches();

    await expect(
      runBeforeNavigate({ ...data, lifecycle: { beforeNavigate: () => false } }),
    ).resolves.toBe(false);
    await expect(
      runBeforeNavigate({ from: null, to: data.to, location: data.location }),
    ).resolves.toBe(true);

    const blockingRoutes = normalizeRoutes([
      { id: 'blocked', path: '/', lifecycle: { beforeEnter: () => false } },
    ]);
    await expect(
      runBeforeNavigate({
        from: null,
        to: matchRoutes(blockingRoutes, '/'),
        location: data.location,
      }),
    ).resolves.toBe(false);
  });

  it('flows errors to route and global handlers', async () => {
    const data = createMatches();
    const error = new Error('boom');

    await runNavigationError(error, {
      ...data,
      lifecycle: {
        onNavigationError(seen) {
          data.calls.push(seen === error ? 'global-error' : 'wrong-error');
        },
      },
    });

    expect(data.calls).toEqual(['error-user', 'global-error']);
  });
});
