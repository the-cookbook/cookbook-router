import type { NormalizedRoute, NormalizedRouteSlotConfig } from '@cookbook/router';

/** Flattens normalized primary, child, and slot routes in stable generation order. */
export function flattenNormalizedRoutes(
  routes: readonly NormalizedRoute[],
): readonly NormalizedRoute[] {
  const flattened: NormalizedRoute[] = [];
  const stack = [...routes].reverse();

  while (stack.length) {
    const route = stack.pop();

    if (!route) {
      continue;
    }

    flattened.push(route);

    const slots = Object.values(route.layout?.slots ?? {}) as readonly NormalizedRouteSlotConfig[];

    for (let index = slots.length - 1; index >= 0; index--) {
      const slot = slots[index];

      if (!slot) {
        continue;
      }

      for (let routeIndex = slot.routes.length - 1; routeIndex >= 0; routeIndex--) {
        const slotRoute = slot.routes[routeIndex];

        if (slotRoute) {
          stack.push(slotRoute);
        }
      }
    }

    for (let index = route.children.length - 1; index >= 0; index--) {
      const child = route.children[index];

      if (child) {
        stack.push(child);
      }
    }
  }

  return flattened;
}
