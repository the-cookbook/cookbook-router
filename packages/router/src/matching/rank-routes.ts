import type { NormalizedRoute, RankedRoute } from '../route-config/contracts';

const rankedCache = new WeakMap<readonly NormalizedRoute[], readonly RankedRoute[]>();
const flattenedCache = new WeakMap<readonly NormalizedRoute[], readonly NormalizedRoute[]>();

export function rankRoutes(routes: readonly NormalizedRoute[]): readonly RankedRoute[] {
  const cached = rankedCache.get(routes);

  if (cached) {
    return cached;
  }

  const ranked = flattenRoutes(routes)
    .filter((route) => route.fullPath)
    .sort(compareRoutes)
    .map((route, rank) => ({ ...route, rank }));

  rankedCache.set(routes, ranked);
  return ranked;
}

export function flattenRoutes(routes: readonly NormalizedRoute[]): readonly NormalizedRoute[] {
  const cached = flattenedCache.get(routes);

  if (cached) {
    return cached;
  }

  const flattened: NormalizedRoute[] = [];
  const stack = [...routes].reverse();

  while (stack.length) {
    const route = stack.pop();

    if (!route) {
      continue;
    }

    flattened.push(route);

    for (let index = route.children.length - 1; index >= 0; index--) {
      const child = route.children[index];

      if (child) {
        stack.push(child);
      }
    }
  }

  flattenedCache.set(routes, flattened);
  return flattened;
}

function compareRoutes(left: NormalizedRoute, right: NormalizedRoute): number {
  const scoreDifference = right.score - left.score;

  if (scoreDifference) {
    return scoreDifference;
  }

  const depthDifference = countSegments(right.fullPath) - countSegments(left.fullPath);

  if (depthDifference) {
    return depthDifference;
  }

  return left.order - right.order;
}

function countSegments(path?: string): number {
  if (!path || path === '/') {
    return 0;
  }

  let count = 1;

  for (let index = 1; index < path.length; index++) {
    if (path[index] === '/') {
      count++;
    }
  }

  return count;
}
