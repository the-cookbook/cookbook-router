import { afterEach, describe, expect, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createMemoryHistory } from '../history/memory-history';
import { createConstraint } from '../path';
import { defineRoutes } from '../route-config/define-routes';
import { createRouter, deserializeRouterState, serializeRouterState } from './create-router';

const routes = defineRoutes([
  { id: 'home', path: '/' },
  { id: 'about', path: '/about' },
] as const);

afterEach(() => {
  resetConstraints();
});

describe('create-router', () => {
  it('uses provided history and exposes resolve helpers', async () => {
    const history = createMemoryHistory({ initialEntries: ['/about'] });
    const router = createRouter({ routes, history });

    expect(router.state.match?.route.id).toBe('about');
    expect(router.resolve('home').href).toBe('/');
    expect(router.href({ route: 'about' })).toBe('/about');
    expect(router.href('about', { context: { source: 'ignored' } })).toBe('/about');
    expect(router.match('/about')?.route.id).toBe('about');

    const match = router.match('/about?redirect=%2Foverview#details');
    expect(match?.route.id).toBe('about');
    expect(match?.pathname).toBe('/about');
    expect(match?.search).toEqual({ redirect: '/overview' });
    expect(match?.hash).toBe('details');
    expect(match?.href).toBe('/about?redirect=%2Foverview#details');

    await router.navigate.to({ route: 'about' });
    expect(router.state.location.href).toBe('/about');

    const serialized = serializeRouterState(router);
    expect(deserializeRouterState(serialized)).toEqual(serialized);
  });

  it('registers custom path constraints before route validation and href generation', () => {
    const slug = createConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });
    const constrainedRoutes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const, {
      pathConstraints: { slug },
    });

    resetConstraints();

    const router = createRouter({
      routes: constrainedRoutes,
      history: createMemoryHistory({ initialEntries: ['/posts/hello-world'] }),
    });

    expect(router.state.match?.route.id).toBe('post');
    expect(router.href('post', { params: { slug: 'hello-world' } })).toBe('/posts/hello-world');
    expect(() => router.href('post', { params: { slug: 'HelloWorld' } })).toThrow('HelloWorld');
  });

  it('registers createRouter path constraints before validation and normalization', () => {
    const slug = createConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });

    const router = createRouter({
      routes: [{ id: 'post', path: '/posts/{slug:create_router_slug}' }],
      pathConstraints: { create_router_slug: slug },
      history: createMemoryHistory({ initialEntries: ['/posts/hello-world'] }),
    });

    expect(router.state.match?.route.id).toBe('post');
    expect(router.href('post', { params: { slug: 'hello-world' } })).toBe('/posts/hello-world');
  });

  it('distinguishes middleware redirect from rewrite during current resolution', async () => {
    const authRoutes = defineRoutes([
      { id: 'private', path: '/private' },
      { id: 'login', path: '/login' },
    ] as const);
    const redirectHistory = createMemoryHistory({ initialEntries: ['/private'] });
    const redirectRouter = createRouter({
      routes: authRoutes,
      history: redirectHistory,
      middleware: [
        ({ route, redirect }) =>
          route.id === 'private' ? redirect('/login?redirect=%2Fprivate') : undefined,
      ],
    });

    await redirectRouter.resolveCurrent();

    expect(redirectRouter.state.location.href).toBe('/login?redirect=%2Fprivate');
    expect(redirectHistory.location.href).toBe('/login?redirect=%2Fprivate');

    const rewriteHistory = createMemoryHistory({ initialEntries: ['/private'] });
    const rewriteRouter = createRouter({
      routes: authRoutes,
      history: rewriteHistory,
      middleware: [
        ({ route, rewrite }) =>
          route.id === 'private' ? rewrite('/login?redirect=%2Fprivate') : undefined,
      ],
    });

    await rewriteRouter.resolveCurrent();

    expect(rewriteRouter.state.location.href).toBe('/login?redirect=%2Fprivate');
    expect(rewriteRouter.state.match?.id).toBe('login');
    expect(rewriteHistory.location.href).toBe('/private');
  });

  it('registers and unregisters runtime middleware', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const router = createRouter({ routes, history });
    const calls: string[] = [];

    const unregister = router.useMiddleware([
      ({ location, redirect }) => {
        calls.push(location.href);
        return location.pathname === '/about' ? redirect('/') : undefined;
      },
    ]);

    await router.navigate.to('about');

    expect(calls).toEqual(['/about', '/']);
    expect(router.state.location.href).toBe('/');
    expect(history.location.href).toBe('/');

    unregister();

    await router.navigate.to('about');

    expect(router.state.location.href).toBe('/about');
  });

  it('throws during route definition when an unknown custom constraint is not registered', () => {
    expect(() => defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const)).toThrow(
      'Unknown constraint type: "slug"',
    );
  });
});

describe('router navigation blockers', () => {
  it('blocks programmatic navigation before history is written', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const router = createRouter({ routes, history });
    router.block(() => false);

    await expect(router.navigate.to('about')).resolves.toMatchObject({ navigation: 'blocked' });

    expect(router.state.location.href).toBe('/');
    expect(history.location.href).toBe('/');
  });

  it('deduplicates repeated replace navigation to the same target while pending', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    let releaseMiddleware: (() => void) | undefined;
    const release = new Promise<void>((resolve) => {
      releaseMiddleware = resolve;
    });
    const router = createRouter({
      routes,
      history,
      middleware: [async () => release],
    });

    const first = router.navigate.replace('about');
    const second = router.navigate.replace('about');

    expect(second).toBe(first);
    releaseMiddleware?.();

    await expect(first).resolves.toMatchObject({ navigation: 'idle' });
    expect(router.state.location.href).toBe('/about');
  });

  it('stores preventScrollReset metadata for navigation consumers', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });
    const router = createRouter({ routes, history });

    await router.navigate.to('about', { preventScrollReset: true });

    expect(router.state.location.state).toEqual({
      __cookbookRouterScroll: { preventReset: true },
    });
    expect(history.location.state).toEqual({
      __cookbookRouterScroll: { preventReset: true },
    });
  });

  it('unregisters navigation blockers', async () => {
    const router = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    const unblock = router.block(() => false);

    unblock();
    await expect(router.navigate.to('about')).resolves.toMatchObject({ navigation: 'idle' });

    expect(router.state.location.href).toBe('/about');
  });
});
