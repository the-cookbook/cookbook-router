import { afterEach, describe, expect, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createConstraint } from '../path';
import { createRouteUrlContract } from './create-route-url-contract';

afterEach(() => {
  resetConstraints();
});

describe('createRouteUrlContract', () => {
  it('creates URLKit contracts in parsed path params mode', () => {
    const contract = createRouteUrlContract({ path: '/users/{id:int}' });

    expect(contract.parsePathname('/users/42')).toEqual({ id: 42 });
    expect(contract.parse('/users/42')).toMatchObject({
      pathname: '/users/42',
      params: { id: 42 },
    });
  });

  it('forwards custom path constraints to URLKit', () => {
    const slug = createConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });

    const contract = createRouteUrlContract(
      { path: '/posts/{slug:router_url_slug}' },
      { pathConstraints: { router_url_slug: slug } },
    );

    expect(contract.parsePathname('/posts/hello-world')).toEqual({ slug: 'hello-world' });
    expect(contract.match('/posts/HelloWorld')).toBe(false);
  });

  it('passes URLKit static search descriptors through without string-only coercion', () => {
    const contract = createRouteUrlContract({
      path: '/products',
      search: {
        page: { type: 'int', default: 1 },
        featured: { type: 'boolean', optional: true },
        tags: { type: 'string', many: true },
      },
    });

    expect(contract.parseSearch('?page=2&featured=true&tags=a&tags=b')).toEqual({
      page: 2,
      featured: true,
      tags: ['a', 'b'],
    });
  });

  it('uses Router static date and date-time format strings with URLKit', () => {
    const contract = createRouteUrlContract({
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
    });

    expect(contract.parse('/products?from=06-06-2026&at=06-06-2026+14%3A30%3A05')).toMatchObject({
      pathname: '/products',
      search: {
        from: new Date(Date.UTC(2026, 5, 6)),
        at: new Date(Date.UTC(2026, 5, 6, 14, 30, 5)),
      },
    });

    expect(
      contract.build({
        search: {
          from: new Date(Date.UTC(2026, 5, 6)),
          at: new Date(Date.UTC(2026, 5, 6, 14, 30, 5)),
        },
      }),
    ).toBe('/products?from=06-06-2026&at=06-06-2026+14%3A30%3A05');
  });

  it('wraps invalid URLKit date format errors with route and search param context', () => {
    expect(() =>
      createRouteUrlContract(
        {
          path: '/products',
          search: {
            from: {
              type: 'date',
              format: 'DD-MM-yyyy',
              optional: true,
            },
          },
        },
        { routeId: 'products' },
      ),
    ).toThrow(/invalid URL descriptor/);
  });

  it('accepts direct router date-time descriptor objects', () => {
    const contract = createRouteUrlContract({
      path: '/reports/{id:int}',
      search: {
        at: {
          type: 'date-time',
          format: 'dd-MM-yyyy HH:mm:ss',
          optional: true,
        },
      },
      hash: { type: 'enum', values: ['summary'], optional: true },
    });

    expect(contract.parseSearch('?at=06-06-2026+14%3A30%3A05')).toEqual({
      at: new Date(Date.UTC(2026, 5, 6, 14, 30, 5)),
    });
    expect(contract.parse('/reports/42?at=06-06-2026+14%3A30%3A05#summary')).toMatchObject({
      params: { id: 42 },
      search: {
        at: new Date(Date.UTC(2026, 5, 6, 14, 30, 5)),
      },
      hash: 'summary',
    });
  });

  it('uses route-level URL options over router-level URL options', () => {
    const contract = createRouteUrlContract(
      {
        path: '/products',
        search: {
          tags: { type: 'string', many: true },
        },
        url: { arrayFormat: 'comma' },
      },
      { routerUrl: { arrayFormat: 'repeat' } },
    );

    expect(contract.build({ search: { tags: ['router', 'typescript'] } })).toBe(
      '/products?tags=router%2Ctypescript',
    );
  });

  it('forwards unknownSearch to URLKit contracts', () => {
    const contract = createRouteUrlContract({
      path: '/products',
      search: {
        page: { type: 'number', optional: true },
      },
      url: { unknownSearch: 'error' },
    });

    expect(() => contract.parseSearch('?page=1&debug=true')).toThrow(
      'Unknown search parameter is not allowed',
    );
    expect(contract.parseSearch('?page=1&debug=true', { unknownSearch: 'strip' })).toEqual({
      page: 1,
    });
  });

  it('uses per-call URL options over route-level URL options', () => {
    const contract = createRouteUrlContract(
      {
        path: '/products',
        search: {
          tags: { type: 'string', many: true },
        },
        url: { arrayFormat: 'comma' },
      },
      {
        routerUrl: { arrayFormat: 'comma' },
        callUrl: { arrayFormat: 'repeat' },
      },
    );

    expect(contract.build({ search: { tags: ['router', 'typescript'] } })).toBe(
      '/products?tags=router&tags=typescript',
    );
  });
});
