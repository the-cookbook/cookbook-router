import { describe, expect, it } from 'vitest';
import type { NormalizedRoute } from '@cookbook/router';
import { flattenNormalizedRoutes } from './flatten-normalized-routes';

function route(id: string, children: readonly NormalizedRoute[] = []): NormalizedRoute {
  return {
    id,
    children,
    params: [],
    index: false,
    score: 0,
    order: 0,
    route: { id },
    slotRoute: false,
    intercepts: [],
  } as unknown as NormalizedRoute;
}

describe('flattenNormalizedRoutes', () => {
  it('preserves primary, child, and slot route generation order', () => {
    const child = route('root.child');
    const slot = route('root.sidebar');
    const root = {
      ...route('root', [child]),
      layout: {
        slots: {
          sidebar: {
            ownerRouteId: 'root',
            name: 'sidebar',
            routes: [slot],
            disabled: false,
          },
        },
      },
    } as unknown as NormalizedRoute;

    expect(flattenNormalizedRoutes([root]).map((entry) => entry.id)).toEqual([
      'root',
      'root.child',
      'root.sidebar',
    ]);
  });
});
