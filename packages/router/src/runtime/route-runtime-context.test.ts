import { describe, expect, it } from 'vitest';
import { defineRoutes } from '../route-config/define-routes';
import { createRouteRuntimeContext } from './route-runtime-context';

describe('createRouteRuntimeContext', () => {
  it('validates, normalizes, ranks, and indexes routes', () => {
    const routes = defineRoutes([
      { id: 'home', path: '/' },
      { id: 'users.show', path: '/users/{id:int}' },
    ] as const);

    const context = createRouteRuntimeContext({ routes });

    expect(context.normalizedRoutes).toHaveLength(2);
    expect(context.rankedRoutes.map((route) => route.id)).toContain('users.show');
    expect(context.routeLookup.get('home')?.id).toBe('home');
  });
});
