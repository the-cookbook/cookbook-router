import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from '../history/memory-history';
import { defineRoutes } from '../route-config/define-routes';
import { createRouter } from './create-router';

describe('create-router hardening', () => {
  it('reports hydration mismatches without logging or throwing during construction', () => {
    const routes = defineRoutes([{ id: 'home', path: '/' }] as const);
    const history = createMemoryHistory({ initialEntries: ['/client'] });
    const router = createRouter({
      routes,
      history,
      hydrationData: {
        location: createMemoryHistory({ initialEntries: ['/server'] }).location,
        navigation: 'idle',
      },
    });

    expect(router.state.location.href).toBe('/server');
    expect(router.state.error).toBeInstanceOf(Error);
    expect(String(router.state.error)).toContain('Hydration data was created for "/server"');
  });

  it('allows client-only hash differences during hydration and syncs them when current location is resolved', async () => {
    const routes = defineRoutes([
      {
        id: 'article',
        path: '/articles/{slug}',
        hash: { type: 'enum', values: ['summary'], optional: true },
      },
    ] as const);
    const history = createMemoryHistory({
      initialEntries: ['/articles/typed-routing?preview=true#summary'],
    });
    const router = createRouter({
      routes,
      history,
      hydrationData: {
        location: createMemoryHistory({
          initialEntries: ['/articles/typed-routing?preview=true'],
        }).location,
        navigation: 'idle',
      },
    });

    expect(router.state.error).toBeUndefined();
    expect(router.state.location.href).toBe('/articles/typed-routing?preview=true');

    await router.resolveCurrent();

    expect(router.state.location.href).toBe('/articles/typed-routing?preview=true#summary');
    expect(router.state.match?.hash).toBe('summary');
  });

  it('ignores stale async navigation commits when a later navigation wins', async () => {
    let releaseFirstNavigation!: () => void;
    const firstNavigation = new Promise<void>((resolve) => {
      releaseFirstNavigation = resolve;
    });
    const routes = defineRoutes([
      { id: 'home', path: '/' },
      { id: 'slow', path: '/slow' },
      { id: 'fast', path: '/fast' },
    ] as const);
    const router = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      middleware: [
        async ({ route }) => {
          if (route.id === 'slow') {
            await firstNavigation;
          }
        },
      ],
    });

    const slow = router.navigate.to('slow');
    const fast = await router.navigate.to('fast');
    releaseFirstNavigation();
    const stale = await slow;

    expect(fast.location.href).toBe('/fast');
    expect(stale.location.href).toBe('/fast');
    expect(router.state.location.href).toBe('/fast');
  });

  it('surfaces after-navigation lifecycle failures in router state', async () => {
    const failure = new Error('analytics failed');
    const routes = defineRoutes([
      { id: 'home', path: '/' },
      { id: 'about', path: '/about' },
    ] as const);
    const router = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      lifecycle: {
        afterNavigate: () => {
          throw failure;
        },
      },
    });

    const state = await router.navigate.to('about');

    expect(state.navigation).toBe('error');
    expect(state.error).toBe(failure);
    expect(router.state.location.href).toBe('/about');
  });

  it('keeps repeated href generation deterministic for hot navigation paths', () => {
    const routes = defineRoutes([{ id: 'users.show', path: '/users/{id:int}' }] as const);
    const router = createRouter({ routes });

    const hrefs = Array.from({ length: 1_000 }, () =>
      router.href('users.show', { params: { id: 42 } }),
    );

    expect(new Set(hrefs)).toEqual(new Set(['/users/42']));
  });

  it('serializes search params in a stable order for cached href generation', () => {
    const routes = defineRoutes([{ id: 'users.show', path: '/users/{id:int}' }] as const);
    const router = createRouter({ routes });

    expect(
      router.href('users.show', {
        params: { id: 42 },
        search: { tab: 'settings', filter: 'active' } as never,
        hash: 'profile',
      }),
    ).toBe('/users/42?filter=active&tab=settings#profile');
  });

  it('handles large repeated href workloads without changing results', () => {
    const routes = defineRoutes([{ id: 'users.show', path: '/users/{id:int}' }] as const);
    const router = createRouter({ routes });
    const hrefs: string[] = [];

    for (let index = 0; index < 2_000; index++) {
      hrefs.push(router.href('users.show', { params: { id: index % 10 } }));
    }

    expect(hrefs[0]).toBe('/users/0');
    expect(hrefs[1_999]).toBe('/users/9');
    expect(new Set(hrefs).size).toBe(10);
  });

  it('validates duplicate resolved child paths at route definition time', () => {
    expect(() =>
      defineRoutes([
        {
          id: 'root',
          path: '/app',
          children: [
            { id: 'one', path: 'settings' },
            { id: 'two', path: 'settings' },
          ],
        },
      ] as const),
    ).toThrow('Duplicate route path "/app/settings"');
  });
});
