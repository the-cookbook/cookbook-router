import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useRouteMeta } from './use-route-meta';

function Page() {
  return null;
}

function createRouter() {
  return createMemoryRouter({
    routes: defineRoutes([
      {
        id: 'root',
        path: '/',
        view: Page,
        meta: {
          breadcrumb: { label: 'Home', to: 'root' },
          chrome: { sidebar: true },
        },
        children: [
          {
            id: 'users',
            path: 'users',
            view: Page,
            meta: {
              breadcrumb: { label: 'Users', to: 'users' },
              chrome: { sidebar: false },
            },
            children: [
              {
                id: 'users.details',
                path: '{id:int}',
                view: Page,
                meta: {
                  breadcrumb: { label: 'Details' },
                  title: 'User details',
                },
              },
            ],
          },
        ],
      },
    ] as const),
    initialEntries: ['/users/42'],
  });
}

describe('useRouteMeta', () => {
  it('returns active route-local metadata by default', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouteMeta(), { wrapper });

    expect(result.current).toEqual({
      breadcrumb: { label: 'Details' },
      title: 'User details',
    });
  });

  it('returns ancestor-aware merged metadata when requested', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(
      () =>
        useRouteMeta({
          includeAncestors: true,
          merge: {
            keys: {
              breadcrumb: 'append',
            },
          },
        }),
      { wrapper },
    );

    expect(result.current).toEqual({
      breadcrumb: [
        { label: 'Home', to: 'root' },
        { label: 'Users', to: 'users' },
        { label: 'Details' },
      ],
      chrome: { sidebar: false },
      title: 'User details',
    });
  });

  it('returns ordered metadata objects when merge is false', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouteMeta({ includeAncestors: true, merge: false }), {
      wrapper,
    });

    expect(result.current).toEqual([
      {
        breadcrumb: { label: 'Home', to: 'root' },
        chrome: { sidebar: true },
      },
      {
        breadcrumb: { label: 'Users', to: 'users' },
        chrome: { sidebar: false },
      },
      {
        breadcrumb: { label: 'Details' },
        title: 'User details',
      },
    ]);
  });

  it('accepts a string merge mode', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouteMeta({ includeAncestors: true, merge: 'leaf' }), {
      wrapper,
    });

    expect(result.current).toEqual({
      breadcrumb: { label: 'Details' },
      chrome: { sidebar: false },
      title: 'User details',
    });
  });

  it('returns a single local metadata object in an array when merge is false without ancestors', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouteMeta({ merge: false }), { wrapper });

    expect(result.current).toEqual([
      {
        breadcrumb: { label: 'Details' },
        title: 'User details',
      },
    ]);
  });

  it('returns target route metadata when a route id is passed', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(() => useRouteMeta('users'), { wrapper });

    expect(result.current).toEqual({
      breadcrumb: { label: 'Users', to: 'users' },
      chrome: { sidebar: false },
    });
  });

  it('returns empty metadata for an unknown target route', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result: merged } = renderHook(() => useRouteMeta('missing'), { wrapper });
    const { result: chain } = renderHook(() => useRouteMeta('missing', { merge: false }), {
      wrapper,
    });

    expect(merged.current).toEqual({});
    expect(chain.current).toEqual([]);
  });

  it('returns target ancestor metadata objects when route id and includeAncestors are passed', async () => {
    const router = createRouter();
    await router.start();
    const wrapper = ({ children }: { children: import('react').ReactNode }) => (
      <RouterProvider router={router}>{children}</RouterProvider>
    );

    const { result } = renderHook(
      () => useRouteMeta('users.details', { includeAncestors: true, merge: false }),
      { wrapper },
    );

    expect(result.current).toEqual([
      {
        breadcrumb: { label: 'Home', to: 'root' },
        chrome: { sidebar: true },
      },
      {
        breadcrumb: { label: 'Users', to: 'users' },
        chrome: { sidebar: false },
      },
      {
        breadcrumb: { label: 'Details' },
        title: 'User details',
      },
    ]);
  });
});
