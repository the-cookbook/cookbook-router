import { describe, expect, it } from 'vitest';
import { normalizeRoutes } from '../matching/normalize-routes';
import { defineRoutes } from '../routes/define-routes';
import { createRouteHref } from './create-href';
import { createRouteLookup } from './create-route-lookup';

describe('createRouteHref', () => {
  it('builds typed numeric params with URLKit', () => {
    const routes = normalizeRoutes(defineRoutes([{ id: 'user', path: '/users/{id:int}' }]));
    const lookup = createRouteLookup(routes);

    expect(
      createRouteHref({ routeId: 'user', options: { params: { id: 42 } }, routes: lookup }),
    ).toBe('/users/42');
    expect(() =>
      createRouteHref({ routeId: 'user', options: { params: { id: 'abc' } }, routes: lookup }),
    ).toThrow('expected param "id"');
  });

  it('does not require optional path params while building hrefs', () => {
    const routes = normalizeRoutes(defineRoutes([{ id: 'page', path: '/pages/{page:min(1)?}' }]));
    const lookup = createRouteLookup(routes);

    expect(createRouteHref({ routeId: 'page', options: {}, routes: lookup })).toBe('/pages');
    expect(
      createRouteHref({ routeId: 'page', options: { params: { page: 2 } }, routes: lookup }),
    ).toBe('/pages/2');
  });

  it('applies route-level and per-call URL options while building search', () => {
    const routes = normalizeRoutes(
      defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { tags: { type: 'string', many: true, optional: true } },
          url: { arrayFormat: 'comma' },
        },
      ]),
    );
    const lookup = createRouteLookup(routes);

    expect(
      createRouteHref({
        routeId: 'products',
        options: { search: { tags: ['router', 'typescript'] } },
        routes: lookup,
        routerUrl: { arrayFormat: 'repeat' },
      }),
    ).toBe('/products?tags=router%2Ctypescript');

    expect(
      createRouteHref({
        routeId: 'products',
        options: {
          search: { tags: ['router', 'typescript'] },
          url: { arrayFormat: 'repeat' },
        },
        routes: lookup,
        routerUrl: { arrayFormat: 'comma' },
      }),
    ).toBe('/products?tags=router&tags=typescript');
  });

  it('forwards default serialization options while building search', () => {
    const routes = normalizeRoutes(
      defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { page: { type: 'int', default: 1 } },
        },
      ]),
    );
    const lookup = createRouteLookup(routes);

    expect(
      createRouteHref({
        routeId: 'products',
        options: { search: { page: 1 }, url: { defaults: 'omit' } },
        routes: lookup,
      }),
    ).toBe('/products');
  });
});
