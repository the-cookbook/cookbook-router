import { describe, expect, expectTypeOf, test } from 'vitest';
import { defineRoutes } from '../routes/define-routes';
import { createMemoryRouter } from './create-memory-router';

const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    children: [
      { id: 'home', index: true },
      { id: 'users.show', path: 'users/{id:int}', hash: ['profile', 'settings'] },
      { id: 'files', path: 'files/{*path}' },
    ],
  },
] as const);

describe('create-memory-router', () => {
  test('creates initial state from memory location', () => {
    const router = createMemoryRouter({
      routes,
      initialEntries: ['/users/42?tab=settings#profile'],
    });

    expect(router.state.location.href).toBe('/users/42?tab=settings#profile');
    expect(router.state.match?.id).toBe('users.show');
    expect(router.state.match?.params).toEqual({ id: '42' });
  });

  test('preserves registered href option inference', () => {
    const router = createMemoryRouter({ routes });

    expectTypeOf(
      router.href('users.show', { params: { id: '1' }, search: { tab: 'x' }, hash: 'profile' }),
    ).toEqualTypeOf<string>();
  });

  test('generates hrefs with params, search, hash, wildcard, and basename', () => {
    const router = createMemoryRouter({ routes, basename: '/app' });

    expect(
      router.href('users.show', {
        params: { id: '42' },
        search: { filters: ['hello', 'world'], tab: 'settings' },
        hash: 'profile',
      }),
    ).toBe('/app/users/42?filters=hello&filters=world&tab=settings#profile');
    expect(router.href('users.show', { params: { id: '1' }, hash: '#settings' })).toBe(
      '/app/users/1#settings',
    );
    expect(router.href('files', { params: { path: 'docs/read me.md' } })).toBe(
      '/app/files/docs/read me.md',
    );
  });

  test('matches routes by stripping basename', () => {
    const router = createMemoryRouter({ routes, basename: '/app' });

    expect(router.match('/app/users/5')?.params).toEqual({ id: '5' });
    expect(router.match('/other/users/5')).toBeNull();
  });

  test('navigates with push, replace, back, forward, and go', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/'] });
    const states: string[] = [];
    const unsubscribe = router.subscribe((state) =>
      states.push(`${state.navigation}:${state.location.href}`),
    );

    await router.navigate.to('users.show', { params: { id: '2' } });
    expect(router.state.location.href).toBe('/users/2');
    await router.navigate.replace('users.show', { params: { id: '3' } });
    expect(router.state.location.href).toBe('/users/3');
    router.navigate.back();
    await flushNavigation();
    expect(router.state.location.href).toBe('/');
    router.navigate.forward();
    await flushNavigation();
    expect(router.state.location.href).toBe('/users/3');
    router.navigate.go(-1);
    await flushNavigation();
    expect(router.state.location.href).toBe('/');
    unsubscribe();

    expect(states).toContain('pending:/');
    expect(states).toContain('idle:/users/2');
  });

  test('uses prune all by default for hrefs and canonical startup URLs', async () => {
    const trailingRoutes = defineRoutes([{ id: 'gallery', path: '/gallery/' }] as const);
    const router = createMemoryRouter({
      routes: trailingRoutes,
      initialEntries: ['/gallery/'],
    });

    await router.resolveCurrent();

    expect(router.href('gallery')).toBe('/gallery');
    expect(router.state.location.href).toBe('/gallery');
    expect(router.state.match?.id).toBe('gallery');
  });

  test('can preserve trailing delimiters when path pruning is disabled', async () => {
    const trailingRoutes = defineRoutes([{ id: 'gallery', path: '/gallery/' }] as const);
    const router = createMemoryRouter({
      routes: trailingRoutes,
      initialEntries: ['/gallery/'],
      pathOptions: { prune: false },
    });

    await router.resolveCurrent();

    expect(router.href('gallery')).toBe('/gallery/');
    expect(router.state.location.href).toBe('/gallery/');
  });

  test('throws helpful href errors for unknown, missing, empty, and invalid params', () => {
    const router = createMemoryRouter({ routes });

    expect(() => router.href('missing')).toThrow('not registered');
    expect(() => router.href('users.show')).toThrow('expected param "id"');
    expect(() => router.href('users.show', { params: { id: '' } })).toThrow('expected param "id"');
    expect(() => router.href('users.show', { params: { id: 'abc' } })).toThrow(
      'expected param "id"',
    );
  });

  test('blocks cancelled middleware without changing the committed URL', async () => {
    const router = createMemoryRouter({
      routes,
      middleware: [({ cancel }) => cancel()],
    });

    await router.navigate.to('users.show', { params: { id: '1' } });

    expect(router.state.navigation).toBe('blocked');
    expect(router.state.location.href).toBe('/');
  });

  test('redirects route entries before rendering the source route', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'entry',
          path: '/',
          redirect: {
            route: 'dashboard',
          },
        },
        {
          id: 'dashboard',
          path: '/dashboard',
        },
      ] as const),
    });

    await router.resolveCurrent();

    expect(router.state.location.href).toBe('/dashboard');
    expect(router.state.match?.id).toBe('dashboard');
    expect(router.state.navigation).toBe('idle');
  });

  test('uses configured maxRedirectDepth for route redirect loops', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'one', path: '/', redirect: { route: 'two' } },
        { id: 'two', path: '/two', redirect: { route: 'one' } },
      ] as const),
      maxRedirectDepth: 1,
    });

    await router.resolveCurrent();

    expect(router.state.navigation).toBe('error');
    expect((router.state.error as Error).message).toBe(
      'Navigation exceeded the maximum redirect count.',
    );
  });

  test('redirects middleware to another URL', async () => {
    const router = createMemoryRouter({
      routes,
      middleware: [
        ({ location, redirect }) => (location.pathname === '/users/1' ? redirect('/') : undefined),
      ],
    });

    await router.navigate.to('users.show', { params: { id: '1' } });

    expect(router.state.location.href).toBe('/');
    expect(router.state.navigation).toBe('idle');
  });

  test('stops redirect loops as navigation errors', async () => {
    const router = createMemoryRouter({
      routes,
      middleware: [({ redirect }) => redirect('/users/1')],
    });

    await router.navigate.to('users.show', { params: { id: '1' } });

    expect(router.state.navigation).toBe('error');
    expect((router.state.error as Error).message).toBe(
      'Navigation exceeded the maximum redirect count.',
    );
  });

  test('runs middleware and lifecycle for the leaf matched route', async () => {
    const events: string[] = [];
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          children: [
            { id: 'home', index: true },
            {
              id: 'admin',
              path: 'admin',
              meta: { requiresAuth: true },
            },
            { id: 'login', path: 'login' },
          ],
        },
      ] as const),
      middleware: [
        ({ route, redirect }) => {
          if (route.route.meta?.requiresAuth) {
            events.push(route.id);
            return redirect('/login');
          }
        },
      ],
    });

    await router.navigate.to('admin');

    expect(events).toEqual(['admin']);
    expect(router.state.location.href).toBe('/login');
    expect(router.state.match?.id).toBe('login');
  });

  test('stores response and thrown errors as navigation errors', async () => {
    const responseRouter = createMemoryRouter({
      routes,
      middleware: [() => new Response('unauthorized')],
    });
    await responseRouter.navigate.to('users.show', { params: { id: '1' } });
    expect(responseRouter.state.navigation).toBe('error');
    expect(responseRouter.state.error).toBeInstanceOf(Response);

    const errorRouter = createMemoryRouter({
      routes,
      lifecycle: {
        beforeNavigate: () => {
          throw new Error('explode');
        },
      },
    });
    await errorRouter.navigate.to('users.show', { params: { id: '1' } });
    expect(errorRouter.state.navigation).toBe('error');
    expect((errorRouter.state.error as Error).message).toBe('explode');
  });

  test('serializes and hydrates router state', async () => {
    const router = createMemoryRouter({ routes });
    await router.navigate.to('users.show', { params: { id: '9' }, search: { tab: 'profile' } });

    const hydrated = createMemoryRouter({ routes, hydrationData: router.serialize() });

    expect(hydrated.state.location.href).toBe('/users/9?tab=profile');
    expect(hydrated.state.match?.id).toBe('users.show');
    expect(hydrated.state.match?.params).toEqual({ id: '9' });
  });

  test('uses hydration location before explicit initial entries', async () => {
    const staticLike = createMemoryRouter({
      routes,
      initialEntries: ['/users/9?tab=settings#profile'],
    });
    await staticLike.resolveCurrent();

    const hydrated = createMemoryRouter({
      routes,
      hydrationData: staticLike.serialize(),
      initialEntries: ['/'],
    });

    expect(hydrated.state.location.href).toBe('/users/9?tab=settings#profile');
    expect(hydrated.state.match?.id).toBe('users.show');
  });
});

async function flushNavigation(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
