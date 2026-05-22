import { describe, expect, test } from 'vitest';
import { normalizeRoutes } from './normalize-routes';

describe('normalizeRoutes', () => {
  test('keeps localPath and resolves fullPath for nested relative paths', () => {
    const [root] = normalizeRoutes([
      {
        id: 'users',
        path: '/users',
        children: [
          {
            id: 'users.show',
            path: '{id:int}',
          },
        ],
      },
    ]);

    const child = root?.children[0];

    expect(root).toMatchObject({
      id: 'users',
      localPath: '/users',
      fullPath: '/users',
      params: [],
    });
    expect(child).toMatchObject({
      id: 'users.show',
      localPath: '{id:int}',
      fullPath: '/users/{id:int}',
      parentId: 'users',
      params: [{ name: 'id', constraint: 'int', token: '{id:int}' }],
    });
  });

  test('supports absolute child paths while preserving render hierarchy', () => {
    const [dashboard] = normalizeRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        children: [
          {
            id: 'pricing',
            path: '/pricing',
          },
        ],
      },
    ]);

    expect(dashboard?.children[0]).toMatchObject({
      id: 'pricing',
      fullPath: '/pricing',
      parentId: 'dashboard',
    });
  });

  test('supports index routes and pathless layout routes', () => {
    const [layout] = normalizeRoutes([
      {
        id: 'dashboard.layout',
        layout: {},
        children: [
          {
            id: 'dashboard',
            path: '/dashboard',
            children: [
              {
                id: 'dashboard.index',
                index: true,
              },
            ],
          },
        ],
      },
    ]);

    const dashboard = layout?.children[0];
    const index = dashboard?.children[0];

    expect(layout).toMatchObject({ id: 'dashboard.layout', score: 0 });
    expect(layout?.fullPath).toBeUndefined();
    expect(dashboard).toMatchObject({ id: 'dashboard', fullPath: '/dashboard' });
    expect(index).toMatchObject({ id: 'dashboard.index', fullPath: '/dashboard', index: true });
  });

  test('inherits parent params and rejects duplicate param names across a branch', () => {
    const [organizations] = normalizeRoutes([
      {
        id: 'organizations',
        path: '/organizations/{organizationId:regex([0-9a-fA-F-]+)}',
        children: [
          {
            id: 'organizations.users.show',
            path: 'users/{userId:int}',
          },
        ],
      },
    ]);

    expect(organizations?.children[0]?.params.map((param) => param.name)).toEqual([
      'organizationId',
      'userId',
    ]);

    expect(() =>
      normalizeRoutes([
        {
          id: 'users',
          path: '/users/{id:int}',
          children: [
            {
              id: 'users.posts',
              path: 'posts/{id:int}',
            },
          ],
        },
      ]),
    ).toThrow('Duplicate parameter');
  });
});

test('normalizes layout-scoped slot fallbacks and slot routes', () => {
  const Sidebar = () => null;
  const Activity = () => null;
  const [dashboard] = normalizeRoutes([
    {
      id: 'dashboard',
      path: '/dashboard',
      layout: {
        component: () => null,
        slots: {
          sidebar: {
            fallback: { component: Sidebar, meta: { chrome: true } },
            routes: [
              {
                id: 'dashboard.sidebar.activity',
                path: 'activity',
                component: Activity,
                meta: { panel: 'activity' },
              },
            ],
          },
          modal: { fallback: null },
        },
      },
    },
  ]);

  const sidebar = dashboard?.layout?.slots?.sidebar;
  const modal = dashboard?.layout?.slots?.modal;

  expect(sidebar).toMatchObject({ ownerRouteId: 'dashboard', name: 'sidebar', disabled: false });
  expect(sidebar?.fallback).toMatchObject({
    id: 'dashboard.sidebar.fallback',
    ownerRouteId: 'dashboard',
    slotName: 'sidebar',
  });
  expect(sidebar?.routes[0]).toMatchObject({
    id: 'dashboard.sidebar.activity',
    fullPath: '/dashboard/activity',
    slotOwnerId: 'dashboard',
    slotName: 'sidebar',
    slotRoute: true,
  });
  expect(modal?.fallback).toBeNull();
});

test('normalizes child slot overrides and disabled inherited slots', () => {
  const [dashboard] = normalizeRoutes([
    {
      id: 'dashboard',
      path: '/dashboard',
      layout: {
        component: () => null,
        slots: {
          sidebar: { fallback: { id: 'dashboard.sidebar.fallback', component: () => null } },
        },
      },
      children: [
        {
          id: 'dashboard.settings',
          path: 'settings',
          layout: {
            slots: {
              sidebar: {
                fallback: { id: 'dashboard.settings.sidebar.fallback', component: () => null },
              },
            },
          },
        },
        {
          id: 'dashboard.fullscreen',
          path: 'fullscreen',
          layout: {
            slots: {
              sidebar: false,
            },
          },
        },
      ],
    },
  ]);

  expect(dashboard?.children[0]?.layout?.slots?.sidebar?.fallback).toMatchObject({
    id: 'dashboard.settings.sidebar.fallback',
  });
  expect(dashboard?.children[1]?.layout?.slots?.sidebar).toMatchObject({
    disabled: true,
    routes: [],
  });
});
