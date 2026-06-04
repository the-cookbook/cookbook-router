import { afterEach, describe, expect, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createConstraint } from '../pathkit/pathkit';
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
        page: { value: 'int', default: 1 },
        featured: { value: 'boolean', optional: true },
        tags: { value: 'string', type: 'many' },
      },
    });

    expect(contract.parseSearch('?page=2&featured=true&tags=a&tags=b')).toEqual({
      page: 2,
      featured: true,
      tags: ['a', 'b'],
    });
  });

  it('uses route-level URL options over router-level URL options', () => {
    const contract = createRouteUrlContract(
      {
        path: '/products',
        search: {
          tags: { type: 'many' },
        },
        url: { arrayFormat: 'comma' },
      },
      { routerUrl: { arrayFormat: 'repeat' } },
    );

    expect(contract.build({ search: { tags: ['router', 'typescript'] } })).toBe(
      '/products?tags=router%2Ctypescript',
    );
  });

  it('uses per-call URL options over route-level URL options', () => {
    const contract = createRouteUrlContract(
      {
        path: '/products',
        search: {
          tags: { type: 'many' },
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
