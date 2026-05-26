import { describe, expect, test } from 'vitest';
import { matchRoutes } from '../matching/match-routes';
import { normalizeRoutes } from '../matching/normalize-routes';
import { getResolvedSlot, resolveSlots } from './resolve-slots';

const DashboardLayout = () => null;
const DashboardSidebar = () => null;
const ActivitySidebar = () => null;
const SettingsSidebar = () => null;

function createDashboardRoutes() {
  return normalizeRoutes([
    {
      id: 'dashboard',
      path: '/dashboard',
      layout: {
        component: DashboardLayout,
        slots: {
          sidebar: {
            fallback: {
              id: 'dashboard.sidebar.fallback',
              component: DashboardSidebar,
              meta: { section: 'root' },
            },
            routes: [
              {
                id: 'dashboard.sidebar.activity',
                path: 'activity',
                component: ActivitySidebar,
                meta: { section: 'activity' },
              },
            ],
          },
          modal: { fallback: null },
          inspector: {
            routes: [
              { id: 'dashboard.inspector.details', path: 'inspector', component: ActivitySidebar },
            ],
          },
        },
      },
      children: [
        { id: 'dashboard.index', index: true },
        {
          id: 'dashboard.activity',
          path: 'activity',
        },
        {
          id: 'dashboard.settings',
          path: 'settings',
          layout: {
            slots: {
              sidebar: {
                fallback: { id: 'dashboard.settings.sidebar.fallback', component: SettingsSidebar },
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
        {
          id: 'dashboard.nested',
          path: 'nested',
          layout: {
            component: DashboardLayout,
            slots: {
              sidebar: {
                fallback: { id: 'dashboard.nested.sidebar.fallback', component: SettingsSidebar },
              },
            },
          },
        },
      ],
    },
  ]);
}

function expectMatch(pathname: string) {
  const match = matchRoutes(createDashboardRoutes(), pathname);

  if (!match) {
    throw new Error(`Expected ${pathname} to match.`);
  }

  return match;
}

describe('resolveSlots', () => {
  test('resolves layout-scoped fallback, empty, and matched slot routes', () => {
    const indexMatch = expectMatch('/dashboard');
    const activityMatch = expectMatch('/dashboard/activity');

    expect(getResolvedSlot(indexMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { id: 'dashboard.sidebar.fallback' },
      meta: { section: 'root' },
    });
    expect(getResolvedSlot(indexMatch.slots, 'dashboard', 'modal')).toMatchObject({
      status: 'empty',
    });
    expect(getResolvedSlot(activityMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'matched',
      match: { id: 'dashboard.sidebar.activity' },
      meta: { section: 'activity' },
    });
  });

  test('supports child fallback overrides and child disabling with false', () => {
    const settingsMatch = expectMatch('/dashboard/settings');
    const fullscreenMatch = expectMatch('/dashboard/fullscreen');

    expect(getResolvedSlot(settingsMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { id: 'dashboard.settings.sidebar.fallback' },
    });
    expect(getResolvedSlot(fullscreenMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'disabled',
    });
  });

  test('keeps nested slot names scoped by layout owner', () => {
    const nestedMatch = expectMatch('/dashboard/nested');

    expect(getResolvedSlot(nestedMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { id: 'dashboard.sidebar.fallback' },
    });
    expect(getResolvedSlot(nestedMatch.slots, 'dashboard.nested', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { id: 'dashboard.nested.sidebar.fallback' },
    });
  });

  test('can resolve slots directly from a branch for SSR', () => {
    const match = expectMatch('/dashboard/activity');
    const slots = resolveSlots(match.branch, '/dashboard/activity');

    expect(getResolvedSlot(slots, 'dashboard', 'sidebar')).toMatchObject({ status: 'matched' });
  });

  test('returns undefined for missing slots', () => {
    const match = expectMatch('/dashboard');

    expect(getResolvedSlot(match.slots, 'dashboard', 'missing')).toBeUndefined();
  });
});
