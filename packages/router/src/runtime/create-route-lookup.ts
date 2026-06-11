import type { NormalizedRoute } from '../route-config/contracts';

/** Builds a flattened route id lookup including nested children and slot routes. */
export function createRouteLookup(
  routes: readonly NormalizedRoute[],
): ReadonlyMap<string, NormalizedRoute> {
  const lookup = new Map<string, NormalizedRoute>();
  appendRoutesToLookup(routes, lookup);
  return lookup;
}

function appendRoutesToLookup(
  routes: readonly NormalizedRoute[],
  lookup: Map<string, NormalizedRoute>,
): void {
  for (const route of routes) {
    lookup.set(route.id, route);
    appendRoutesToLookup(route.children, lookup);

    for (const slot of Object.values(route.layout?.slots ?? {})) {
      appendRoutesToLookup(slot.routes, lookup);
    }
  }
}
