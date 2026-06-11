import { describe, expect, it } from 'vitest';
import { defineRoutes } from '../route-config/define-routes';
import { createStaticRouter } from './create-static-router';

const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    children: [
      { id: 'home', index: true, view: 'home' },
      { id: 'users.show', path: 'users/{id:int}', view: 'user' },
    ],
  },
] as const);

describe('createStaticRouter', () => {
  it('resolves string URLs', async () => {
    const router = createStaticRouter({ routes, url: '/users/42?tab=settings#profile' });
    await router.resolveCurrent();
    expect(router.state.location.href).toBe('/users/42?tab=settings#profile');
    expect(router.state.match?.route.id).toBe('users.show');
  });

  it('accepts URL objects for SSR ergonomics', () => {
    const router = createStaticRouter({
      routes,
      url: new URL('https://example.test/users/42?tab=settings#profile'),
    });
    expect(router.state.location.href).toBe('/users/42?tab=settings#profile');
  });

  it('accepts Request objects or a request option', () => {
    const request = new Request('https://example.test/users/42');
    expect(createStaticRouter({ routes, url: request }).state.location.href).toBe('/users/42');
    expect(createStaticRouter({ routes, request }).state.location.href).toBe('/users/42');
  });

  it('applies routerUrl unknownSearch during static route resolution', () => {
    const router = createStaticRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { page: { type: 'number', optional: true } },
        },
      ]),
      url: '/products?page=1&debug=true',
      routerUrl: { unknownSearch: 'error' },
    });

    expect(router.state.match?.id).toBe('products');
    expect(router.state.error).toBeDefined();
  });

  it('rejects non-HTTP protocols for SSR request safety', () => {
    expect(() => createStaticRouter({ routes, url: 'javascript:alert(1)' })).toThrow(
      'Static router URL must use http, https',
    );
  });

  it('throws when no URL source is provided', () => {
    expect(() => createStaticRouter({ routes })).toThrow('requires either url or request');
  });
});
