import { describe, expect, it } from 'vitest';
import { validateRouteUrlDescriptor } from './validate-route-url-descriptor';

describe('validateRouteUrlDescriptor', () => {
  it('accepts cleaned URLKit static search and hash descriptors', () => {
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

  it('rejects removed search shorthand fields', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            q: 'string',
          },
        } as never,
      }),
    ).toThrow('uses removed shorthand');
  });

  it('rejects removed search value descriptors', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            page: { value: 'int', default: 1 },
          },
        } as never,
      }),
    ).toThrow('uses removed "value" descriptors');
  });

  it('rejects removed cardinality type descriptors', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            tags: { type: 'many', value: 'string' },
          },
        } as never,
      }),
    ).toThrow('uses removed cardinality type "many"');
  });

  it('rejects non-literal positive search flags', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            q: { type: 'string', optional: false },
          },
        } as never,
      }),
    ).toThrow('must omit optional instead of using optional: false');

    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            tags: { type: 'string', many: 'yes' },
          },
        } as never,
      }),
    ).toThrow('many must be literal true when provided');
  });

  it('rejects search descriptors that combine optional and default', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          search: {
            page: { type: 'int', optional: true, default: 1 },
          },
        } as never,
      }),
    ).toThrow('cannot combine optional: true with default');
  });

  it('rejects removed hash array shorthand', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          hash: ['details', 'reviews'],
        } as never,
      }),
    ).toThrow('hash uses removed array shorthand');
  });

  it('rejects invalid hash flags and optional default combinations', () => {
    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          hash: { type: 'string', optional: false },
        } as never,
      }),
    ).toThrow('hash must omit optional instead of using optional: false');

    expect(() =>
      validateRouteUrlDescriptor({
        route: {
          id: 'products',
          path: '/products',
          hash: { type: 'string', optional: true, default: 'details' },
        } as never,
      }),
    ).toThrow('hash cannot combine optional: true with default');
  });

  it('rejects hash values with a leading number sign', () => {
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
