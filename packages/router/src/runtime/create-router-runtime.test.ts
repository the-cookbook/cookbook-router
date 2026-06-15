import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { defineRoutes } from '../route-config/define-routes';
import { createRouterRuntime } from './create-router-runtime';

async function waitForAssertion(assertion: () => void, attempts = 10): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await Promise.resolve();
    }
  }

  throw lastError;
}

describe('createRouterRuntime', () => {
  it('creates a router from an explicit history implementation', () => {
    const router = createRouterRuntime({
      routes: defineRoutes([{ id: 'home', path: '/' }] as const),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    expect(router.state.location.href).toBe('/');
    expect(router.state.match?.id).toBe('home');
  });

  it('dedupes concurrent start calls and exposes starting state', async () => {
    let releaseStartup: (() => void) | undefined;
    const startupGate = new Promise<void>((resolve) => {
      releaseStartup = resolve;
    });
    const middleware = vi.fn(async () => startupGate);
    const router = createRouterRuntime({
      routes: defineRoutes([{ id: 'home', path: '/' }] as const),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      middleware: [middleware],
    });

    const first = router.start();
    const second = router.start();

    expect(second).toBe(first);
    expect(router.started).toBe(false);
    expect(router.starting).toBe(true);

    await waitForAssertion(() => {
      expect(middleware).toHaveBeenCalledTimes(1);
    });

    releaseStartup?.();

    await expect(first).resolves.toMatchObject({ navigation: 'idle' });
    expect(router.started).toBe(true);
    expect(router.starting).toBe(false);
    expect(middleware).toHaveBeenCalledTimes(1);
  });

  it('does not re-resolve current location when start is called after startup', async () => {
    const middleware = vi.fn();
    const router = createRouterRuntime({
      routes: defineRoutes([{ id: 'home', path: '/' }] as const),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      middleware: [middleware],
    });

    const startedState = await router.start();
    const repeatedState = await router.start();

    expect(repeatedState).toBe(startedState);
    expect(router.started).toBe(true);
    expect(router.starting).toBe(false);
    expect(middleware).toHaveBeenCalledTimes(1);
  });

  it('refresh re-resolves the current location after startup', async () => {
    const middleware = vi.fn();
    const router = createRouterRuntime({
      routes: defineRoutes([{ id: 'home', path: '/' }] as const),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      middleware: [middleware],
    });

    await router.start();
    await router.refresh();

    expect(router.started).toBe(true);
    expect(router.starting).toBe(false);
    expect(middleware).toHaveBeenCalledTimes(2);
  });

  it('refresh can apply newly registered middleware without pushing history', async () => {
    const history = createMemoryHistory({ initialEntries: ['/private'] });
    const router = createRouterRuntime({
      routes: defineRoutes([
        { id: 'private', path: '/private' },
        { id: 'login', path: '/login' },
      ] as const),
      history,
    });

    await router.start();

    router.useMiddleware([
      ({ route, rewrite }) => (route.id === 'private' ? rewrite('/login') : undefined),
    ]);

    await router.refresh();

    expect(router.state.location.href).toBe('/login');
    expect(router.state.match?.id).toBe('login');
    expect(history.location.href).toBe('/private');
  });

  it('dispose removes the history listener and clears subscribers', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const router = createRouterRuntime({
      routes: defineRoutes([
        { id: 'home', path: '/' },
        { id: 'about', path: '/about' },
      ] as const),
      history,
    });
    const listener = vi.fn();
    router.subscribe(listener);

    await router.start();
    router.dispose();
    history.push('/about');

    expect(router.disposed).toBe(true);
    expect(router.state.location.href).toBe('/');
    expect(listener).not.toHaveBeenCalledWith(
      expect.objectContaining({ location: expect.objectContaining({ href: '/about' }) }),
    );
  });

  it('dispose clears runtime middleware and blockers and rejects future work', async () => {
    const middleware = vi.fn();
    const blocker = vi.fn();
    const router = createRouterRuntime({
      routes: defineRoutes([
        { id: 'home', path: '/' },
        { id: 'about', path: '/about' },
      ] as const),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    router.useMiddleware([middleware]);
    router.block(blocker);
    router.dispose();

    expect(() => router.start()).toThrow('Router has been disposed');
    expect(() => router.refresh()).toThrow('Router has been disposed');
    expect(() => router.preloadHref('/about')).toThrow('Router has been disposed');
    expect(() => router.navigate.to('/about')).toThrow('Router has been disposed');
    expect(() => router.useMiddleware([middleware])).toThrow('Router has been disposed');
    expect(() => router.block(blocker)).toThrow('Router has been disposed');
    expect(middleware).not.toHaveBeenCalled();
    expect(blocker).not.toHaveBeenCalled();
  });

  it('runs middleware on initial start even when the initial location already has a match', async () => {
    const router = createRouterRuntime({
      history: createMemoryHistory({ initialEntries: ['/about'] }),
      routes: defineRoutes([
        { id: 'home', path: '/' },
        { id: 'about', path: '/about' },
        { id: 'login', path: '/login', search: { redirect: { type: 'string', optional: true } } },
      ] as const),
      middleware: [
        ({ route, redirect }) => {
          if (route?.route.id === 'about') {
            return redirect('/login?redirect=%2Fabout');
          }
        },
      ],
    });

    await router.start();

    expect(router.state.location.href).toBe('/login?redirect=%2Fabout');
  });
});
