import { describe, expect, it } from 'vitest';
import { defineRoutes } from '../route-config/define-routes';
import { createMemoryRouter } from './create-memory-router';
import { getRouteMetaChain, mergeRouteMetaChain } from './route-meta';

function createRoutes() {
  return defineRoutes([
    {
      id: 'root',
      path: '/',
      meta: {
        breadcrumb: { label: 'Home', to: 'root' },
        chrome: { sidebar: true, density: 'comfortable' },
      },
      children: [
        {
          id: 'users',
          path: 'users',
          meta: {
            breadcrumb: { label: 'Users', to: 'users' },
            chrome: { density: 'compact' },
          },
          children: [
            {
              id: 'users.details',
              path: '{id:int}',
              meta: {
                breadcrumb: { label: 'Details' },
                title: 'User details',
              },
            },
          ],
        },
      ],
    },
  ] as const);
}

describe('route meta utilities', () => {
  it('returns route-local metadata by default', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details');

    expect(chain.map((entry) => entry.id)).toEqual(['users.details']);
    expect(mergeRouteMetaChain(chain)).toEqual({
      breadcrumb: { label: 'Details' },
      title: 'User details',
    });
  });

  it('returns ancestor metadata when requested', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details', { includeAncestors: true });

    expect(chain.map((entry) => entry.id)).toEqual(['root', 'users', 'users.details']);
  });

  it('merges metadata with key-specific append behavior', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details', { includeAncestors: true });

    expect(
      mergeRouteMetaChain(chain, {
        keys: {
          breadcrumb: 'append',
        },
      }),
    ).toEqual({
      breadcrumb: [
        { label: 'Home', to: 'root' },
        { label: 'Users', to: 'users' },
        { label: 'Details' },
      ],
      chrome: { sidebar: true, density: 'compact' },
      title: 'User details',
    });
  });

  it('supports deep metadata merging', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details', { includeAncestors: true });

    expect(
      mergeRouteMetaChain(chain, {
        default: 'deep',
      }).chrome,
    ).toEqual({ sidebar: true, density: 'compact' });
  });

  it('accepts a string merge mode', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details', { includeAncestors: true });

    expect(mergeRouteMetaChain(chain, 'leaf')).toEqual({
      breadcrumb: { label: 'Details' },
      chrome: { density: 'compact' },
      title: 'User details',
    });
  });

  it('preserves parent-only keys when using leaf merge mode', () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          meta: {
            headerHeight: 16,
          },
          children: [
            {
              id: 'child',
              path: 'child',
              meta: {
                title: 'foo',
              },
            },
          ],
        },
      ] as const),
    });
    const chain = getRouteMetaChain(router.routes, 'child', { includeAncestors: true });

    expect(mergeRouteMetaChain(chain, 'leaf')).toEqual({
      headerHeight: 16,
      title: 'foo',
    });
  });

  it('accepts append as a string merge mode', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details', { includeAncestors: true });

    expect(mergeRouteMetaChain(chain, 'append')).toEqual({
      breadcrumb: [
        { label: 'Home', to: 'root' },
        { label: 'Users', to: 'users' },
        { label: 'Details' },
      ],
      chrome: [{ sidebar: true, density: 'comfortable' }, { density: 'compact' }],
      title: ['User details'],
    });
  });

  it('returns an empty chain for unknown route ids', () => {
    const router = createMemoryRouter({ routes: createRoutes() });

    expect(getRouteMetaChain(router.routes, 'missing')).toEqual([]);
    expect(mergeRouteMetaChain(getRouteMetaChain(router.routes, 'missing'))).toEqual({});
  });

  it('skips undefined values and preserves null values', () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          meta: {
            title: 'Root',
            optional: undefined,
            nullable: 'root',
          },
          children: [
            {
              id: 'child',
              path: 'child',
              meta: {
                title: undefined,
                nullable: null,
              },
            },
          ],
        },
      ] as const),
    });

    const chain = getRouteMetaChain(router.routes, 'child', { includeAncestors: true });

    expect(mergeRouteMetaChain(chain)).toEqual({
      title: 'Root',
      nullable: null,
    });
  });

  it('does not merge arrays during deep metadata merging', () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          meta: {
            config: {
              tabs: ['overview'],
              nested: { keep: true },
            },
          },
          children: [
            {
              id: 'child',
              path: 'child',
              meta: {
                config: {
                  tabs: ['details'],
                  nested: { child: true },
                },
              },
            },
          ],
        },
      ] as const),
    });

    const chain = getRouteMetaChain(router.routes, 'child', { includeAncestors: true });

    expect(mergeRouteMetaChain(chain, { default: 'deep' })).toEqual({
      config: {
        tabs: ['details'],
        nested: { keep: true, child: true },
      },
    });
  });

  it('supports prepend metadata collection', () => {
    const router = createMemoryRouter({ routes: createRoutes() });
    const chain = getRouteMetaChain(router.routes, 'users.details', { includeAncestors: true });

    expect(
      mergeRouteMetaChain(chain, {
        keys: {
          breadcrumb: 'prepend',
        },
      }).breadcrumb,
    ).toEqual([
      { label: 'Details' },
      { label: 'Users', to: 'users' },
      { label: 'Home', to: 'root' },
    ]);
  });
});
