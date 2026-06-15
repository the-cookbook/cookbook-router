import { afterEach, describe, expect, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createMemoryHistory } from '../history/memory-history';
import { createPathConstraint } from '../path';
import { defineRoutes } from '../route-config/define-routes';
import { createRouter } from './create-router';

afterEach(() => {
  resetConstraints();
});

describe('create-router URLKit runtime integration', () => {
  it('parses int and number path params to numbers', () => {
    const router = createRouter({
      routes: defineRoutes([
        { id: 'int', path: '/users/{id:int}' },
        { id: 'number', path: '/prices/{value:decimal}' },
      ]),
      history: createMemoryHistory({ initialEntries: ['/users/42'] }),
    });

    expect(router.state.match?.params).toEqual({ id: 42 });
    expect(router.match('/prices/19.5')?.params).toEqual({ value: 19.5 });
  });

  it('keeps custom constraint params as strings and rejects invalid values', () => {
    const slug = createPathConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });
    const routes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }], {
      pathConstraints: { slug },
    });
    resetConstraints();

    const router = createRouter({ routes });

    expect(router.match('/posts/hello-world')?.params).toEqual({ slug: 'hello-world' });
    expect(router.match('/posts/HelloWorld')).toBeNull();
    expect(() => router.href('post', { params: { slug: 'HelloWorld' } })).toThrow('HelloWorld');
  });

  it('registers createRouter path constraints before URLKit contract usage', () => {
    const tenant = createPathConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^t_[a-z]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a tenant id`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('tenant does not accept parameters');
        }
      },
      toRegExp: () => 't_[a-z]+',
    });

    const router = createRouter({
      routes: [{ id: 'tenant', path: '/tenants/{id:tenant}' }],
      pathConstraints: { tenant },
    });

    expect(router.match('/tenants/t_acme')?.params).toEqual({ id: 't_acme' });
    expect(router.href('tenant', { params: { id: 't_acme' } })).toBe('/tenants/t_acme');
  });

  it('uses URLKit for href, match, resolve, search, and hash state', () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products/{page:int}',
          search: { tags: { type: 'string', many: true, optional: true } },
          hash: { type: 'enum', values: ['grid', 'list'], optional: true },
        },
      ]),
      url: { arrayFormat: 'repeat', unknownSearch: 'preserve' },
    });

    expect(
      router.href('products', {
        params: { page: 2 },
        search: { tags: ['router', 'typescript'] },
        hash: '#grid',
      }),
    ).toBe('/products/2?tags=router&tags=typescript#grid');
    expect(() => router.href('products', { params: { page: 'x' } })).toThrow(
      'expected param "page"',
    );

    const match = router.match('/products/3?tags=router,typescript#list', {
      url: { arrayFormat: 'comma' },
    });
    expect(match?.params).toEqual({ page: 3 });
    expect(match?.search).toEqual({ tags: ['router', 'typescript'] });
    expect(match?.hash).toBe('list');

    const resolved = router.resolve('products', {
      params: { page: 4 },
      search: { tags: ['a', 'b'] },
      hash: 'grid',
      url: { arrayFormat: 'comma' },
    });
    expect(resolved.params).toEqual({ page: 4 });
    expect(resolved.search).toEqual({ tags: ['a', 'b'] });
    expect(resolved.href).toBe('/products/4?tags=a%2Cb#grid');
  });

  it('uses URLKit custom date and date-time format strings from static descriptors', () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: {
            from: {
              type: 'date',
              format: 'dd-MM-yyyy',
              optional: true,
            },
            at: {
              type: 'date-time',
              format: 'dd-MM-yyyy HH:mm:ss',
              optional: true,
            },
          },
        },
      ]),
    });

    expect(router.match('/products?at=06-06-2026+14%3A30%3A05&from=06-06-2026')?.search).toEqual({
      from: new Date(Date.UTC(2026, 5, 6)),
      at: new Date(Date.UTC(2026, 5, 6, 14, 30, 5)),
    });
    expect(
      router.href('products', {
        search: {
          from: new Date(Date.UTC(2026, 5, 6)),
          at: new Date(Date.UTC(2026, 5, 6, 14, 30, 5)),
        },
      }),
    ).toBe('/products?at=06-06-2026+14%3A30%3A05&from=06-06-2026');
  });

  it('surfaces invalid date format descriptors during router creation', () => {
    expect(() =>
      createRouter({
        routes: [
          {
            id: 'products',
            path: '/products',
            search: {
              from: {
                type: 'date',
                format: 'DD-MM-yyyy',
                optional: true,
              },
            },
          },
        ],
      }),
    ).toThrow(/invalid URL descriptor/);
  });

  it('applies router, route, and per-call arrayFormat precedence', () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { tags: { type: 'string', many: true, optional: true } },
          url: { arrayFormat: 'comma' },
        },
      ]),
      url: { arrayFormat: 'repeat' },
    });

    expect(router.href('products', { search: { tags: ['a', 'b'] } })).toBe('/products?tags=a%2Cb');
    expect(
      router.href('products', {
        search: { tags: ['a', 'b'] },
        url: { arrayFormat: 'repeat' },
      }),
    ).toBe('/products?tags=a&tags=b');
    expect(router.match('/products?tags=a,b')?.search).toEqual({ tags: ['a', 'b'] });
    expect(
      router.match('/products?tags=a&tags=b', { url: { arrayFormat: 'repeat' } })?.search,
    ).toEqual({
      tags: ['a', 'b'],
    });
  });

  it('recovers from invalid search params by default and with invalidSearch recover', () => {
    const routes = defineRoutes([
      {
        id: 'overview',
        path: '/overview',
        search: {
          page: { type: 'number', default: 1 },
          pageSize: { type: 'number', optional: true },
        },
      },
    ]);

    const router = createRouter({
      routes,
      history: createMemoryHistory({
        initialEntries: ['/overview?page=a&pageSize=10'],
      }),
    });

    expect(router.state.error).toBeUndefined();
    expect(router.state.match?.search).toEqual({ page: 1, pageSize: 10 });
    expect(
      router.match('/overview?page=a&pageSize=10', {
        url: { invalidSearch: 'recover' },
      })?.search,
    ).toEqual({ page: 1, pageSize: 10 });
  });

  it('treats invalid search as no-match when configured', () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'overview',
          path: '/overview',
          search: { page: { type: 'number', optional: true } },
        },
        { id: 'not-found', path: '/{*path}' },
      ]),
      url: { invalidSearch: 'no-match' },
    });

    expect(router.match('/overview?page=a')?.id).toBe('not-found');
  });

  it('keeps matched route and surfaces router error when invalid search is error', () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'overview',
          path: '/overview',
          search: { page: { type: 'number', optional: true } },
        },
        { id: 'not-found', path: '/{*path}' },
      ]),
      history: createMemoryHistory({ initialEntries: ['/overview?page=a'] }),
      url: { invalidSearch: 'error' },
    });

    expect(router.state.match?.id).toBe('overview');
    expect(router.state.error).toBeDefined();
    expect(router.match('/overview?page=a')?.id).toBe('overview');
  });

  it('applies unknownSearch policies during route resolution', () => {
    const routes = defineRoutes([
      {
        id: 'products',
        path: '/products',
        search: { page: { type: 'number', optional: true } },
      },
    ]);

    const defaultRouter = createRouter({ routes });
    expect(defaultRouter.match('/products?page=1&debug=true')?.search).toEqual({ page: 1 });

    const preserveRouter = createRouter({ routes, url: { unknownSearch: 'preserve' } });
    const preserveMatch = preserveRouter.match('/products?page=1&debug=true');
    expect(preserveMatch?.search).toEqual({ page: 1 });
    expect(preserveMatch?.unknownSearch).toEqual({ debug: 'true' });

    const errorRouter = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/products?page=1&debug=true'] }),
      url: { unknownSearch: 'error' },
    });
    expect(errorRouter.state.match?.id).toBe('products');
    expect(errorRouter.state.error).toBeDefined();
  });

  it('lets route-level unknownSearch override router-level unknownSearch', () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { page: { type: 'number', optional: true } },
          url: { unknownSearch: 'strip' },
        },
      ]),
      history: createMemoryHistory({ initialEntries: ['/products?page=1&debug=true'] }),
      url: { unknownSearch: 'error' },
    });

    expect(router.state.error).toBeUndefined();
    expect(router.state.match?.search).toEqual({ page: 1 });
    expect(router.state.match?.unknownSearch).toBeUndefined();
  });

  it('supports recover, no-match, and error policies for invalid hash', () => {
    const routes = defineRoutes([
      {
        id: 'products',
        path: '/products',
        hash: { type: 'enum', values: ['grid', 'list'], optional: true },
      },
      { id: 'not-found', path: '/{*path}' },
    ]);

    const recoverRouter = createRouter({ routes });
    expect(recoverRouter.match('/products#bad')?.id).toBe('products');
    expect(recoverRouter.match('/products#bad')?.hash).toBeUndefined();

    const noMatchRouter = createRouter({ routes, url: { invalidHash: 'no-match' } });
    expect(noMatchRouter.match('/products#bad')?.id).toBe('not-found');

    const errorRouter = createRouter({
      routes,
      history: createMemoryHistory({ initialEntries: ['/products#bad'] }),
      url: { invalidHash: 'error' },
    });
    expect(errorRouter.state.match?.id).toBe('products');
    expect(errorRouter.state.error).toBeDefined();
  });

  it('uses per-call URL options for navigation match state', async () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'products',
          path: '/products',
          search: { tags: { type: 'string', many: true, optional: true } },
        },
      ]),
      url: { arrayFormat: 'repeat' },
    });

    await router.navigate.to('products', {
      search: { tags: ['a', 'b'] },
      url: { arrayFormat: 'comma' },
    });

    expect(router.state.location.href).toBe('/products?tags=a%2Cb');
    expect(router.state.match?.search).toEqual({ tags: ['a', 'b'] });
  });

  it('passes parsed params, search, and hash to middleware and lifecycle contexts', async () => {
    const seen: unknown[] = [];
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'product',
          path: '/products/{id:int}',
          search: { tags: { type: 'string', many: true, optional: true } },
          hash: { type: 'enum', values: ['grid'], optional: true },
        },
      ]),
      url: { arrayFormat: 'comma' },
      middleware: [
        ({ params, search, hash, unknownSearch }) => {
          seen.push({ source: 'middleware', params, search, hash, unknownSearch });
        },
      ],
      lifecycle: {
        beforeNavigate: ({ params, search, hash, unknownSearch }) => {
          seen.push({ source: 'lifecycle', params, search, hash, unknownSearch });
        },
      },
    });

    await router.navigate.to('product', {
      params: { id: 7 },
      search: { tags: ['a', 'b'] },
      hash: 'grid',
    });

    expect(seen).toEqual([
      {
        source: 'lifecycle',
        params: { id: 7 },
        search: { tags: ['a', 'b'] },
        hash: 'grid',
      },
      {
        source: 'middleware',
        params: { id: 7 },
        search: { tags: ['a', 'b'] },
        hash: 'grid',
      },
    ]);
  });

  it('uses URLKit href construction for route redirects', async () => {
    const router = createRouter({
      routes: defineRoutes([
        {
          id: 'entry',
          path: '/',
          redirect: {
            route: 'products',
            search: { tags: ['a', 'b'] },
          },
        },
        {
          id: 'products',
          path: '/products',
          search: { tags: { type: 'string', many: true, optional: true } },
          url: { arrayFormat: 'comma' },
        },
      ]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    await router.start();

    expect(router.state.location.href).toBe('/products?tags=a%2Cb');
    expect(router.state.match?.search).toEqual({ tags: ['a', 'b'] });
  });
});
