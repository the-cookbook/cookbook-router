import { UrlKitError } from '@cookbook/urlkit';
import { describe, expect, it } from 'vitest';
import { validateRouteUrlDescriptor } from './validate-route-url-descriptor';

describe('validateRouteUrlDescriptor', () => {
  it('accepts URLKit static search and hash descriptors', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            page: { type: 'int', default: 1 },
            tags: { type: 'string', many: true, optional: true },
            sort: { type: 'enum', values: ['newest', 'popular'], optional: true },
          },
          hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
        },
      }),
    ).not.toThrow();
  });

  it('delegates invalid static search descriptor forms to URLKit', () => {
    for (const search of [
      { q: 'string' },
      { page: { value: 'int', default: 1 } },
      { tags: { type: 'many', value: 'string' } },
      { q: { type: 'string', optional: false } },
      { tags: { type: 'string', many: false } },
      { page: { type: 'int', optional: true, default: 1 } },
    ]) {
      expect(() =>
        validateRouteUrlDescriptor({
          route: {
            id: 'products',
            path: '/products',
            search,
          } as never,
        }),
      ).toThrow(UrlKitError);
    }
  });

  it('delegates invalid static hash descriptor forms to URLKit', () => {
    for (const hash of [
      ['details', 'reviews'],
      { type: 'string', optional: false },
      { type: 'string', optional: true, default: 'details' },
    ]) {
      expect(() =>
        validateRouteUrlDescriptor({
          route: {
            id: 'products',
            path: '/products',
            hash,
          } as never,
        }),
      ).toThrow(UrlKitError);
    }
  });

  it('preserves URLKit descriptor error metadata with route context', () => {
    try {
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            page: { type: 'int', optional: true, default: 1 },
          },
        } as never,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(UrlKitError);
      expect((error as UrlKitError).code).toBe('invalid-descriptor');
      expect(error).toHaveProperty('cause');
      expect((error as Error).message).toContain('Route "products" has an invalid URL descriptor.');
      return;
    }

    throw new Error('Expected URLKit descriptor validation to fail.');
  });

  it('rejects hash values with a leading number sign as Router descriptor hardening', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          hash: { type: 'enum', values: ['#details'] },
        } as never,
      }),
    ).toThrow('must not include a leading #');

    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          hash: { type: 'string', default: '#details' },
        } as never,
      }),
    ).toThrow('must not include a leading #');
  });
});
