import { describe, expect, it } from 'vitest';
import type { NormalizedRoute } from '../routes/contracts';
import { createRouteLookup } from './create-route-lookup';

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

describe('createRouteLookup', () => {
  it('includes nested children and slot routes', () => {
    const slotRoute = route('layout.sidebar');
    const child = route('users.show');
    const root = {
      ...route('root', [child]),
      layout: {
        slots: {
          sidebar: {
            ownerRouteId: 'root',
            name: 'sidebar',
            routes: [slotRoute],
            disabled: false,
          },
        },
      },
    } as unknown as NormalizedRoute;

    const lookup = createRouteLookup([root]);

    expect([...lookup.keys()]).toEqual(['root', 'users.show', 'layout.sidebar']);
    expect(lookup.get('users.show')).toBe(child);
    expect(lookup.get('layout.sidebar')).toBe(slotRoute);
  });
});
