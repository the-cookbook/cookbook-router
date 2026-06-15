import { describe, expect, it, vi } from 'vitest';
import { defineRoutes } from '../route-config/define-routes';
import { createMemoryRouter } from './create-memory-router';

function ParentViewBase() {
  return null;
}

function ParentLayoutBase() {
  return null;
}

function ChildViewBase() {
  return null;
}

describe('router preload', () => {
  it('runs module preload, lazy view preload, and route preload from parent to child without navigation', async () => {
    const calls: string[] = [];
    const ParentLayout = Object.assign(ParentLayoutBase, {
      preload: vi.fn(() => {
        calls.push('parent-layout');
      }),
    });
    const ParentView = Object.assign(ParentViewBase, {
      preload: vi.fn(() => {
        calls.push('parent-view');
      }),
    });
    const ChildView = Object.assign(ChildViewBase, {
      preload: vi.fn(() => {
        calls.push('child-view');
      }),
    });
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          modulePreload: () => {
            calls.push('parent-module');
          },
          layout: { view: ParentLayout },
          view: ParentView,
          preload: async () => {
            calls.push('parent-route');
          },
          children: [
            {
              id: 'child',
              path: 'child',
              modulePreload: () => {
                calls.push('child-module');
              },
              view: ChildView,
              preload: async ({ params }) => {
                expect(params).toEqual({});
                calls.push('child-route');
              },
            },
          ],
        },
      ] as const),
    });
    await router.start();

    await router.preload('child');

    expect(calls).toEqual([
      'parent-module',
      'parent-layout',
      'parent-view',
      'parent-route',
      'child-module',
      'child-view',
      'child-route',
    ]);
    expect(router.state.location.href).toBe('/');
  });

  it('passes parsed target context to route preload', async () => {
    const preload = vi.fn();
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'user',
          path: '/users/{id:int}',
          search: { tab: { type: 'string', optional: true } },
          hash: { type: 'enum', values: ['profile'], optional: true },
          preload,
        },
      ] as const),
    });

    await router.preload('user', {
      params: { id: 42 },
      search: { tab: 'settings' },
      hash: 'profile',
    });

    expect(preload).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ href: '/users/42?tab=settings#profile' }),
        params: { id: 42 },
        search: { tab: 'settings' },
        hash: 'profile',
      }),
    );
  });

  it('dedupes concurrent href preloads without caller-owned abort signals', async () => {
    let resolvePreload: (() => void) | undefined;
    const preload = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePreload = resolve;
        }),
    );
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', preload }] as const),
    });

    const first = router.preloadHref('/');
    const second = router.preloadHref('/');
    resolvePreload?.();

    await Promise.all([first, second]);
    expect(second).toBe(first);
    expect(preload).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe caller-signaled preloads so each caller owns cancellation', async () => {
    const preload = vi.fn();
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', preload }] as const),
    });
    const first = new AbortController();
    const second = new AbortController();

    await Promise.all([
      router.preloadHref('/', { signal: first.signal }),
      router.preloadHref('/', { signal: second.signal }),
    ]);

    expect(preload).toHaveBeenCalledTimes(2);
  });

  it('rejects explicit preload failures', async () => {
    const error = new Error('boom');
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', preload: async () => Promise.reject(error) },
      ] as const),
    });

    await expect(router.preload('home')).rejects.toBe(error);
  });

  it('throws unknown href preload errors synchronously', () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/' }] as const),
    });

    expect(() => router.preloadHref('/missing')).toThrow('not registered');
  });

  it('does not run middleware, blockers, or lifecycle hooks', async () => {
    const middleware = vi.fn();
    const blocker = vi.fn();
    const beforeNavigate = vi.fn();
    const afterNavigate = vi.fn();
    const preload = vi.fn();
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', preload }] as const),
      middleware: [middleware],
      lifecycle: { beforeNavigate, afterNavigate },
    });
    router.block(blocker);

    await router.preload('home');

    expect(preload).toHaveBeenCalledTimes(1);
    expect(middleware).not.toHaveBeenCalled();
    expect(blocker).not.toHaveBeenCalled();
    expect(beforeNavigate).not.toHaveBeenCalled();
    expect(afterNavigate).not.toHaveBeenCalled();
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const preload = vi.fn();
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', preload }] as const),
    });
    const controller = new AbortController();
    controller.abort();

    await expect(router.preload('home', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(preload).not.toHaveBeenCalled();
  });

  it('stops between branch entries when the signal is aborted', async () => {
    const controller = new AbortController();
    const childPreload = vi.fn();
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          preload: () => {
            controller.abort();
          },
          children: [{ id: 'child', path: 'child', preload: childPreload }],
        },
      ] as const),
    });

    await expect(router.preload('child', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(childPreload).not.toHaveBeenCalled();
  });
});
