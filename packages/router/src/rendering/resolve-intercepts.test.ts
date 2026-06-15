import { describe, expect, it } from 'vitest';
import { matchRoutes } from '../matching/match-routes';
import { normalizeRoutes } from '../route-config/normalize-routes';
import {
  createInterceptHistoryState,
  normalizeCallSiteIntercept,
  normalizeConfiguredIntercepts,
  resolveIntercept,
  restoreInterceptFromState,
  validateInterceptTargets,
} from './resolve-intercepts';

function BlogLayout() {}
function BlogIndex() {}
function BlogPostPage() {}
function BlogPostModal() {}

const routes = normalizeRoutes([
  {
    id: 'blog',
    path: '/blog',
    layout: {
      view: BlogLayout,
      slots: {
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: 'blog.posts.show',
        view: BlogPostModal,
      },
    },
    children: [{ id: 'blog.index', index: true, view: BlogIndex }],
  },
  { id: 'blog.posts.show', path: '/blog/{slug:regex([a-z0-9-]+)}', view: BlogPostPage },
] as const);

describe('resolveIntercept', () => {
  it('normalizes configured intercepts to target route ids', () => {
    const blog = routes[0];

    expect(blog && normalizeConfiguredIntercepts(blog)).toEqual([
      {
        sourceRouteId: 'blog',
        slot: 'modal',
        targetRouteId: 'blog.posts.show',
        view: BlogPostModal,
      },
    ]);
  });

  it('normalizes configured intercepts from a single target route id', () => {
    const singleTargetRoutes = normalizeRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: { view: BlogLayout, slots: { modal: true } },
        intercepts: { modal: { to: 'create', view: BlogPostModal } },
      },
      { id: 'create', path: '/create', view: BlogPostPage },
    ] as const);

    expect(singleTargetRoutes[0]?.intercepts).toEqual([
      {
        sourceRouteId: 'dashboard',
        slot: 'modal',
        targetRouteId: 'create',
        view: BlogPostModal,
      },
    ]);
  });

  it('resolves configured interception from a source route to a destination route', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');

    expect(
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/blog/hello-world',
        intercept: 'modal',
      }),
    ).toMatchObject({
      slot: 'modal',
      sourceRouteId: 'blog',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
      configured: true,
    });
  });

  it('automatically resolves configured interception without a call-site intercept option', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');

    expect(
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/blog/hello-world',
      }),
    ).toMatchObject({
      slot: 'modal',
      sourceRouteId: 'blog',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
      configured: true,
    });
  });

  it('does not resolve configured interception when a call site opts out', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');

    expect(
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/blog/hello-world',
        intercept: false,
      }),
    ).toBeNull();
  });

  it('uses a string intercept option only as configured slot disambiguation', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');

    expect(
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/blog/hello-world',
        intercept: 'drawer',
      }),
    ).toBeNull();
  });

  it('resolves call-site interception with view', () => {
    expect(normalizeCallSiteIntercept({ slot: 'modal', view: BlogPostModal })).toEqual({
      slot: 'modal',
      view: BlogPostModal,
    });
  });

  it('throws when a call-site intercept has no render target', () => {
    expect(() => normalizeCallSiteIntercept({ slot: 'modal' })).toThrow(/must define view/);
  });

  it('throws for a missing slot in development', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');

    expect(() =>
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/blog/hello-world',
        intercept: { slot: 'drawer', view: BlogPostModal },
      }),
    ).toThrow(/does not define or render that slot/);
  });

  it('returns null for a missing slot in production mode so navigation can continue normally', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');

    expect(
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/blog/hello-world',
        intercept: { slot: 'drawer', view: BlogPostModal },
        production: true,
      }),
    ).toBeNull();
  });

  it('throws when an automatic configured intercept matches but its slot is unavailable', () => {
    const NoSlotModal = BlogPostModal;
    const noSlotRoutes = normalizeRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        intercepts: {
          modal: { to: 'create', view: NoSlotModal },
        },
      },
      { id: 'create', path: '/create', view: BlogPostPage },
    ] as const);
    const source = matchRoutes(noSlotRoutes, '/dashboard');
    const destination = matchRoutes(noSlotRoutes, '/create');

    expect(() =>
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/create',
      }),
    ).toThrow(/does not define or render that slot/);
  });

  it('falls back when an automatic configured intercept matches an unavailable slot in production', () => {
    const noSlotRoutes = normalizeRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        intercepts: {
          modal: { to: 'create', view: BlogPostModal },
        },
      },
      { id: 'create', path: '/create', view: BlogPostPage },
    ] as const);
    const source = matchRoutes(noSlotRoutes, '/dashboard');
    const destination = matchRoutes(noSlotRoutes, '/create');

    expect(
      resolveIntercept({
        source,
        destination,
        destinationPathname: '/create',
        production: true,
      }),
    ).toBeNull();
  });

  it('restores configured interception and navigation context from browser history state', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');
    const context = { source: 'article-card', index: 1 };
    const resolved = resolveIntercept({
      source,
      destination,
      destinationPathname: '/blog/hello-world',
      intercept: 'modal',
      context,
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.context).toEqual(context);

    const state = createInterceptHistoryState(resolved!, '/blog');

    expect(() => structuredClone(state)).not.toThrow();
    expect(state.__cookbookRouterIntercept.context).toEqual(context);
    expect(restoreInterceptFromState(state, source, destination)).toMatchObject({
      slot: 'modal',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
      context,
    });
  });

  it('stores call-site intercept views outside cloneable browser history state', () => {
    const source = matchRoutes(routes, '/blog');
    const destination = matchRoutes(routes, '/blog/hello-world');
    const context = { source: 'call-site-card' };
    const resolved = resolveIntercept({
      source,
      destination,
      destinationPathname: '/blog/hello-world',
      intercept: { slot: 'modal', view: BlogPostModal },
      context,
    });

    expect(resolved).not.toBeNull();

    const state = createInterceptHistoryState(resolved!, '/blog');

    expect(state.__cookbookRouterIntercept).not.toHaveProperty('component');
    expect(state.__cookbookRouterIntercept.viewKey).toMatch(/^call-site:/);
    expect(() => structuredClone(state)).not.toThrow();
    expect(state.__cookbookRouterIntercept.context).toEqual(context);
    expect(restoreInterceptFromState(state, source, destination)).toMatchObject({
      slot: 'modal',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
      configured: false,
      context,
    });
  });

  it('validates that configured intercept targets point at canonical routes', () => {
    expect(() => validateInterceptTargets(routes)).not.toThrow();

    const invalid = normalizeRoutes([
      {
        id: 'blog',
        path: '/blog',
        layout: { view: BlogLayout, slots: { modal: true } },
        intercepts: {
          modal: { to: ['missing.show'], view: BlogPostModal },
        },
      },
    ] as const);

    expect(() => validateInterceptTargets(invalid)).toThrow(/targets unknown route id/);
  });
});
