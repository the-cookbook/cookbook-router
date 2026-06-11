import { describe, expect, it } from 'vitest';
import { matchRoutes } from '../matching/match-routes';
import { normalizeRoutes } from '../route-config/normalize-routes';
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
        view: DashboardLayout,
        slots: {
          sidebar: {
            view: DashboardSidebar,
            meta: { section: 'root' },
            routes: [
              {
                id: 'dashboard.sidebar.activity',
                path: 'activity',
                view: ActivitySidebar,
                meta: { section: 'activity' },
              },
            ],
          },
          modal: true,
          inspector: {
            routes: [
              { id: 'dashboard.inspector.details', path: 'inspector', view: ActivitySidebar },
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
              sidebar: SettingsSidebar,
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
        {
          id: 'dashboard.nested',
          path: 'nested',
          layout: {
            view: DashboardLayout,
            slots: {
              sidebar: SettingsSidebar,
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
  it('resolves layout-scoped fallback, empty, and matched slot routes', () => {
    const indexMatch = expectMatch('/dashboard');
    const activityMatch = expectMatch('/dashboard/activity');

    expect(getResolvedSlot(indexMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { ownerRouteId: 'dashboard' },
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

  it('supports child fallback overrides and declaration-only child slots', () => {
    const settingsMatch = expectMatch('/dashboard/settings');
    const fullscreenMatch = expectMatch('/dashboard/fullscreen');

    expect(getResolvedSlot(settingsMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { ownerRouteId: 'dashboard.settings' },
    });
    expect(getResolvedSlot(fullscreenMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'empty',
    });
  });

  it('keeps nested slot names scoped by layout owner', () => {
    const nestedMatch = expectMatch('/dashboard/nested');

    expect(getResolvedSlot(nestedMatch.slots, 'dashboard', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { ownerRouteId: 'dashboard' },
    });
    expect(getResolvedSlot(nestedMatch.slots, 'dashboard.nested', 'sidebar')).toMatchObject({
      status: 'fallback',
      fallback: { ownerRouteId: 'dashboard.nested' },
    });
  });

  it('can resolve slots directly from a branch for SSR', () => {
    const match = expectMatch('/dashboard/activity');
    const slots = resolveSlots(match.branch, '/dashboard/activity');

    expect(getResolvedSlot(slots, 'dashboard', 'sidebar')).toMatchObject({ status: 'matched' });
  });

  it('returns undefined for missing slots', () => {
    const match = expectMatch('/dashboard');

    expect(getResolvedSlot(match.slots, 'dashboard', 'missing')).toBeUndefined();
  });
});
