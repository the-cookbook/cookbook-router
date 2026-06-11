import { describe, expect, it } from 'vitest';
import { matchRoutes } from '../matching/match-routes';
import { normalizeRoutes } from '../route-config/normalize-routes';
import type { RouteMatch } from '../route-config/contracts';
import { resolveIntercept } from './resolve-intercepts';
import { renderRouteMatch } from './render-route-match';

const routes = normalizeRoutes([
  {
    id: 'root',
    path: '/',
    layout: {
      view: 'root-layout',
      slots: {
        sidebar: 'sidebar-fallback',
      },
    },
    children: [
      {
        id: 'home',
        index: true,
        view: 'home-view',
      },
    ],
  },
] as const);

function expectMatch(routesToMatch: ReturnType<typeof normalizeRoutes>, href: string): RouteMatch {
  const match = matchRoutes(routesToMatch, href);

  if (!match) {
    throw new Error(`Expected ${href} to match.`);
  }

  return match;
}

describe('renderRouteMatch', () => {
  it('returns fallback for a missing match', () => {
    expect(
      renderRouteMatch(null, {
        fallback: 'not-found',
        renderView: (view) => String(view),
      }),
    ).toBe('not-found');
  });

  it('traverses route views, layout views, outlets, and slot shorthand fallback views', () => {
    const match = matchRoutes(routes, '/');

    const rendered = renderRouteMatch(match, {
      fallback: '',
      renderView(view, context) {
        return `${String(view)}${context.outlet}`;
      },
      renderLayout(view, context) {
        return `${String(view)}[${context.outlet}][sidebar=${context.slots.sidebar ?? ''}]`;
      },
      renderSlot(view) {
        return String(view);
      },
    });

    expect(rendered).toBe('root-layout[home-view][sidebar=sidebar-fallback]');
  });

  it('wraps route views with renderer boundaries using core-resolved fallbacks', () => {
    const routesWithFallbacks = normalizeRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
          view: 'root-layout',
          loading: 'layout-loading',
          error: 'layout-error',
        },
        children: [
          {
            id: 'home',
            index: true,
            view: 'home-view',
            loading: 'home-loading',
            error: 'home-error',
          },
        ],
      },
    ] as const);
    const match = matchRoutes(routesWithFallbacks, '/');
    const boundaries: string[] = [];

    const rendered = renderRouteMatch(match, {
      fallback: '',
      renderView(view, context) {
        return `${String(view)}${context.outlet}`;
      },
      renderLayout(view, context) {
        return `${String(view)}[${context.outlet}]`;
      },
      renderBoundary(outlet, context) {
        boundaries.push(
          `${context.match.id}:${String(context.loading?.view ?? '')}:${String(
            context.error?.view ?? '',
          )}`,
        );
        return `boundary(${outlet})`;
      },
    });

    expect(rendered).toBe('root-layout[boundary(boundary(home-view))]');
    expect(boundaries).toEqual([
      'home:home-loading:home-error',
      'root:layout-loading:layout-error',
    ]);
  });

  it('passes a child outlet through routes without a view', () => {
    const passThroughRoutes = normalizeRoutes([
      {
        id: 'root',
        path: '/',
        layout: { view: 'root-layout' },
        children: [
          {
            id: 'group',
            path: 'group',
            children: [{ id: 'group.home', index: true, view: 'group-home' }],
          },
        ],
      },
    ] as const);
    const match = expectMatch(passThroughRoutes, '/group');

    expect(
      renderRouteMatch(match, {
        fallback: '',
        renderView: (view, context) => `${String(view)}${context.outlet}`,
        renderLayout: (view, context) => `${String(view)}[${context.outlet}]`,
      }),
    ).toBe('root-layout[group-home]');
  });

  it('renders nested layouts in branch order', () => {
    const nestedRoutes = normalizeRoutes([
      {
        id: 'root',
        path: '/',
        layout: { view: 'root-layout' },
        children: [
          {
            id: 'dashboard',
            path: 'dashboard',
            layout: { view: 'dashboard-layout' },
            children: [{ id: 'dashboard.index', index: true, view: 'dashboard-view' }],
          },
        ],
      },
    ] as const);
    const match = expectMatch(nestedRoutes, '/dashboard');

    expect(
      renderRouteMatch(match, {
        fallback: '',
        renderView: (view, context) => `${String(view)}${context.outlet}`,
        renderLayout: (view, context) => `${String(view)}[${context.outlet}]`,
      }),
    ).toBe('root-layout[dashboard-layout[dashboard-view]]');
  });

  it('renders matched slot routes and slot object fallbacks', () => {
    const slotRoutes = normalizeRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          view: 'dashboard-layout',
          slots: {
            sidebar: {
              view: 'sidebar-fallback',
              routes: [
                { id: 'dashboard.sidebar.activity', path: 'activity', view: 'activity-sidebar' },
              ],
            },
          },
        },
        children: [
          { id: 'dashboard.index', index: true, view: 'dashboard-index' },
          { id: 'dashboard.activity', path: 'activity', view: 'dashboard-activity' },
        ],
      },
    ] as const);

    expect(
      renderRouteMatch(expectMatch(slotRoutes, '/dashboard'), {
        fallback: '',
        renderView: (view, context) => `${String(view)}${context.outlet}`,
        renderLayout: (view, context) =>
          `${String(view)}[${context.outlet}][${context.slots.sidebar ?? ''}]`,
        renderSlot: (view) => String(view),
      }),
    ).toBe('dashboard-layout[dashboard-index][sidebar-fallback]');

    expect(
      renderRouteMatch(expectMatch(slotRoutes, '/dashboard/activity'), {
        fallback: '',
        renderView: (view, context) => `${String(view)}${context.outlet}`,
        renderLayout: (view, context) =>
          `${String(view)}[${context.outlet}][${context.slots.sidebar ?? ''}]`,
      }),
    ).toBe('dashboard-layout[dashboard-activity][activity-sidebar]');
  });

  it('reports empty, disabled, and not-found slot states through renderEmpty', () => {
    const match = expectMatch(
      normalizeRoutes([
        {
          id: 'root',
          path: '/',
          layout: { view: 'root-layout', slots: { modal: true } },
          children: [{ id: 'home', index: true, view: 'home-view' }],
        },
      ] as const),
      '/',
    );
    const reasons: string[] = [];

    renderRouteMatch(match, {
      fallback: '',
      renderView: (view, context) => `${String(view)}${context.outlet}`,
      renderLayout: (view, context) => `${String(view)}[${context.slots.modal ?? ''}]`,
      renderEmpty(context) {
        reasons.push(context.reason);
        return context.reason;
      },
    });

    expect(reasons).toContain('empty-slot');

    const disabledMatch: RouteMatch = {
      ...match,
      slots: {
        root: {
          modal: {
            ownerRouteId: 'root',
            name: 'modal',
            status: 'disabled',
            config: { ownerRouteId: 'root', name: 'modal', routes: [], disabled: true },
            params: {},
          },
        },
      },
    };

    expect(
      renderRouteMatch(disabledMatch, {
        fallback: 'fallback',
        renderView: (view, context) => `${String(view)}${context.outlet}`,
        renderLayout: (_view, context) => context.slots.modal ?? '',
        renderEmpty: (context) => context.reason,
      }),
    ).toBe('disabled-slot');
  });

  it('renders configured and call-site intercept views in the owning slot', () => {
    function createInterceptRoutes(interceptView: string) {
      return normalizeRoutes([
        {
          id: 'blog',
          path: '/blog',
          layout: { view: 'blog-layout', slots: { modal: true } },
          intercepts: { modal: { to: 'blog.posts.show', view: interceptView } },
          children: [{ id: 'blog.index', index: true, view: 'blog-index' }],
        },
        { id: 'blog.posts.show', path: '/blog/{slug}', view: 'post-page' },
      ] as const);
    }

    const configuredRoutes = createInterceptRoutes('configured-modal');
    const source = expectMatch(configuredRoutes, '/blog');
    const destination = expectMatch(configuredRoutes, '/blog/hello');
    const configuredIntercept = resolveIntercept({
      source,
      destination,
      destinationPathname: '/blog/hello',
    });

    if (!configuredIntercept) {
      throw new Error('Expected configured intercept to resolve.');
    }

    expect(
      renderRouteMatch(
        {
          ...source,
          intercepted: {
            slot: configuredIntercept.slot,
            sourceRouteId: configuredIntercept.sourceRouteId,
            targetRouteId: configuredIntercept.targetRouteId,
            previousHref: configuredIntercept.previousLocation,
            match: destination,
            view: configuredIntercept.view,
          },
        },
        {
          fallback: '',
          renderView: (view, context) => `${String(view)}${context.outlet}`,
          renderLayout: (view, context) =>
            `${String(view)}[${context.outlet}][${context.slots.modal ?? ''}]`,
          renderIntercept: (view, context) => `${String(view)}(${context.outlet})`,
        },
      ),
    ).toBe('blog-layout[blog-index][configured-modal(post-page)]');

    const callSiteIntercept = resolveIntercept({
      source,
      destination,
      destinationPathname: '/blog/hello',
      intercept: { slot: 'modal', view: 'call-site-modal' },
    });

    if (!callSiteIntercept) {
      throw new Error('Expected call-site intercept to resolve.');
    }

    expect(
      renderRouteMatch(
        {
          ...source,
          intercepted: {
            slot: callSiteIntercept.slot,
            sourceRouteId: callSiteIntercept.sourceRouteId,
            targetRouteId: callSiteIntercept.targetRouteId,
            previousHref: callSiteIntercept.previousLocation,
            match: destination,
            view: callSiteIntercept.view,
          },
        },
        {
          fallback: '',
          renderView: (view, context) => `${String(view)}${context.outlet}`,
          renderLayout: (view, context) =>
            `${String(view)}[${context.outlet}][${context.slots.modal ?? ''}]`,
          renderIntercept: (view, context) => `${String(view)}(${context.outlet})`,
        },
      ),
    ).toBe('blog-layout[blog-index][call-site-modal(post-page)]');
  });

  it('renders route and layout error fallbacks for leaf errors', () => {
    const routeFallbackRoutes = normalizeRoutes([
      { id: 'home', path: '/', view: 'home-view', error: 'home-error' },
    ] as const);
    const layoutFallbackRoutes = normalizeRoutes([
      {
        id: 'root',
        path: '/',
        layout: { view: 'root-layout', error: 'layout-error' },
        children: [{ id: 'home', index: true, view: 'home-view' }],
      },
    ] as const);

    const renderErrorOptions = {
      fallback: '',
      error: new Error('boom'),
      renderView: (view: unknown, context: { outlet: string }) =>
        `${String(view)}${context.outlet}`,
      renderLayout: (view: unknown, context: { outlet: string }) =>
        `${String(view)}[${context.outlet}]`,
      renderError: (view: unknown) => `error:${String(view)}`,
    };

    expect(renderRouteMatch(expectMatch(routeFallbackRoutes, '/'), renderErrorOptions)).toBe(
      'error:home-error',
    );
    expect(renderRouteMatch(expectMatch(layoutFallbackRoutes, '/'), renderErrorOptions)).toBe(
      'root-layout[error:layout-error]',
    );
  });
});
