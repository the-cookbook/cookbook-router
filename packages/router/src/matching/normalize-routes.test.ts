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

  test('joins leading-slash child paths with their parent while preserving render hierarchy', () => {
    const [policies] = normalizeRoutes([
      {
        id: 'policies',
        path: '/policies',
        children: [
          {
            id: 'terms-of-service',
            path: '/terms-of-service',
          },
        ],
      },
    ]);

    expect(policies?.children[0]).toMatchObject({
      id: 'terms-of-service',
      localPath: '/terms-of-service',
      fullPath: '/policies/terms-of-service',
      parentId: 'policies',
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
            component: Sidebar,
            meta: { chrome: true },
            routes: [
              {
                id: 'dashboard.sidebar.activity',
                path: 'activity',
                component: Activity,
                meta: { panel: 'activity' },
              },
            ],
          },
          modal: true,
        },
      },
    },
  ]);

  const sidebar = dashboard?.layout?.slots?.sidebar;
  const modal = dashboard?.layout?.slots?.modal;

  expect(sidebar).toMatchObject({ ownerRouteId: 'dashboard', name: 'sidebar', disabled: false });
  expect(sidebar?.fallback).toMatchObject({
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
  expect(modal?.fallback).toBeUndefined();
});

test('normalizes child slot overrides and declaration-only inherited slots', () => {
  const [dashboard] = normalizeRoutes([
    {
      id: 'dashboard',
      path: '/dashboard',
      layout: {
        component: () => null,
        slots: {
          sidebar: () => null,
        },
      },
      children: [
        {
          id: 'dashboard.settings',
          path: 'settings',
          layout: {
            slots: {
              sidebar: () => null,
            },
          },
        },
        {
          id: 'dashboard.fullscreen',
          path: 'fullscreen',
          layout: {
            slots: {
              sidebar: true,
            },
          },
        },
      ],
    },
  ]);

  expect(dashboard?.children[0]?.layout?.slots?.sidebar?.fallback).toBeTruthy();
  expect(dashboard?.children[1]?.layout?.slots?.sidebar).toMatchObject({
    disabled: false,
    routes: [],
  });
});
