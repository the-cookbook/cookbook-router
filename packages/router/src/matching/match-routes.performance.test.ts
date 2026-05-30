import { describe, expect, it } from 'vitest';
import { matchRoutes } from './match-routes';
import { normalizeRoutes } from './normalize-routes';

const routes = normalizeRoutes([
  {
    id: 'root',
    path: '/',
    children: Array.from({ length: 100 }, (_, index) => ({
      id: `items.${index}`,
      path: `items-${index}/{id:int}`,
    })),
  },
]);

describe('matchRoutes performance-sensitive behavior', () => {
  it('reuses cached ranking and parent indexes for repeated matching', () => {
    const results = Array.from(
      { length: 500 },
      () => matchRoutes(routes, '/items-75/123')?.route.id,
    );

    expect(new Set(results)).toEqual(new Set(['items.75']));
  });
});
