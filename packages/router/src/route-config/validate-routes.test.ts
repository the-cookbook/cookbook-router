import { UrlKitError } from '@cookbook/urlkit';
import { describe, expect, it } from 'vitest';
import { validateRoutes } from './validate-routes';

describe('validateRoutes', () => {
  it('accepts valid route trees, slot defaults, declaration-only slots, and slot routes', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'dashboard',
          path: '/dashboard',
          layout: {
            view: {},
            slots: {
              sidebar: {
                view: {},
                meta: { chrome: true },
                routes: [
                  {
                    id: 'dashboard.sidebar.activity',
                    path: 'activity',
                  },
                ],
              },
              modal: true,
            },
          },
          children: [
            {
              id: 'dashboard.index',
              index: true,
            },
          ],
        },
      ]),
    ).not.toThrow();
  });

  it('rejects missing and duplicate route ids', () => {
    expect(() => validateRoutes([{ id: '', path: '/' }])).toThrow('non-empty string id');
    expect(() =>
      validateRoutes([
        { id: 'home', path: '/' },
        { id: 'home', path: '/home' },
      ]),
    ).toThrow('Duplicate route id');
  });

  it('rejects invalid index route shapes', () => {
    expect(() => validateRoutes([{ id: 'home', index: true, path: '/' }])).toThrow(
      'must not define path',
    );
    expect(() =>
      validateRoutes([{ id: 'home', index: true, children: [{ id: 'child', path: '/child' }] }]),
    ).toThrow('must not define children');
  });

  it('rejects empty paths and invalid URLKit path patterns', () => {
    expect(() => validateRoutes([{ id: 'empty', path: '' }])).toThrow('empty path');
    expect(() => validateRoutes([{ id: 'bad', path: '/users/{id:unknown}' }])).toThrow(
      'Unknown constraint type',
    );
  });

  it('rejects duplicate absolute route paths', () => {
    expect(() =>
      validateRoutes([
        { id: 'one', path: '/same' },
        { id: 'two', path: '/same' },
      ]),
    ).toThrow('Duplicate route path "/same"');
  });

  it('validates leading-slash child paths relative to their parent route', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'policies',
          path: '/policies',
          children: [
            {
              id: 'terms-of-service',
              path: '/terms-of-service',
            },
          ],
        },
      ]),
    ).not.toThrow();

    expect(() =>
      validateRoutes([
        {
          id: 'one',
          path: '/one',
          children: [{ id: 'one.child', path: '/child' }],
        },
        {
          id: 'two',
          path: '/two',
          children: [{ id: 'two.child', path: '/child' }],
        },
      ]),
    ).not.toThrow();
  });

  it('rejects invalid hash configuration', () => {
    expect(() =>
      validateRoutes([{ id: 'array-hash', path: '/', hash: ['summary'] } as never]),
    ).toThrow('invalid URL descriptor');
    expect(() =>
      validateRoutes([
        {
          id: 'optional-default-hash',
          path: '/',
          hash: { type: 'string', optional: true, default: 'top' },
        } as never,
      ]),
    ).toThrow('invalid URL descriptor');
  });

  it('rejects invalid slot names and removed slot forms', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'root',
          path: '/',
          layout: {
            view: {},
            slots: {
              '': true,
            },
          },
        },
      ]),
    ).toThrow('empty name');

    expect(() =>
      validateRoutes([
        {
          id: 'root',
          path: '/',
          layout: {
            view: {},
            slots: {
              sidebar: {
                id: 'root.sidebar',
                view: {},
              } as never,
            },
          },
        },
      ]),
    ).toThrow(
      'Route "root" declares "layout.slots.sidebar.id", but slot IDs are no longer supported. Use the slot key as the slot identity.',
    );

    expect(() =>
      validateRoutes([
        {
          id: 'root',
          path: '/',
          layout: {
            view: {},
            slots: {
              sidebar: {
                fallback: { view: {} },
              } as never,
            },
          },
        },
      ]),
    ).toThrow('slot fallbacks are no longer supported');
  });
});

it('rejects invalid slot object and routes configuration', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
          view: {},
          slots: {
            sidebar: false as never,
          },
        },
      },
    ]),
  ).toThrow('invalid configuration for slot');

  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
          view: {},
          slots: {
            sidebar: {
              routes: {} as never,
            },
          },
        },
      },
    ]),
  ).toThrow('routes must be an array');

  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
          view: {},
          slots: {
            sidebar: {
              routes: [{ id: 'bad.slot', path: '/bad/{id:unknown}' }],
            },
          },
        },
      },
    ]),
  ).toThrow('Unknown constraint type');
});

it('allows a slot route to share the primary branch URL it decorates', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          view: {},
          slots: {
            sidebar: {
              routes: [{ id: 'dashboard.sidebar.activity', path: 'activity/{id:int}' }],
            },
          },
        },
        children: [{ id: 'dashboard.activity', path: 'activity/{id:int}' }],
      },
    ]),
  ).not.toThrow();
});

it('allows the same path in different layout slot scopes', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          view: {},
          slots: {
            sidebar: {
              routes: [{ id: 'dashboard.sidebar.activity', path: 'activity/{id:int}' }],
            },
            modal: {
              routes: [{ id: 'dashboard.modal.activity', path: 'activity/{id:int}' }],
            },
          },
        },
      },
    ]),
  ).not.toThrow();
});

it('rejects duplicate route paths inside the same layout slot scope', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          view: {},
          slots: {
            sidebar: {
              routes: [
                { id: 'dashboard.sidebar.one', path: 'activity/{id:int}' },
                { id: 'dashboard.sidebar.two', path: 'activity/{id:int}' },
              ],
            },
          },
        },
      },
    ]),
  ).toThrow('Duplicate route path "/dashboard/activity/{id:int}"');
});

it('rejects malformed route redirect configuration', () => {
  expect(() => validateRoutes([{ id: 'entry', path: '/', redirect: '' }])).toThrow(
    'redirect must be a non-empty string',
  );

  expect(() =>
    validateRoutes([{ id: 'entry', path: '/', redirect: { route: '' } as never }]),
  ).toThrow('redirect.route must be a non-empty string');

  expect(() =>
    validateRoutes([{ id: 'entry', path: '/', redirect: { route: 'home', params: [] } as never }]),
  ).toThrow('redirect.params must be an object');
});

it('requires renderable and redirect routes to declare path or index', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'entry',
        path: '/',
        children: [
          {
            id: 'entry.redirect',
            redirect: { route: 'overview' },
          },
          {
            id: 'overview',
            path: 'overview',
          },
        ],
      },
    ]),
  ).toThrow(
    'Route "entry.redirect" must define either path or index. Pathless routes are only supported as layout/group routes with children.',
  );

  expect(() =>
    validateRoutes([
      {
        id: 'entry',
        path: '/',
        children: [
          {
            id: 'entry.redirect',
            index: true,
            redirect: { route: 'overview' },
          },
          {
            id: 'overview',
            path: 'overview',
          },
        ],
      },
    ]),
  ).not.toThrow();

  expect(() =>
    validateRoutes([
      {
        id: 'pathless.layout',
        layout: {},
        children: [
          {
            id: 'overview',
            path: '/overview',
          },
        ],
      },
    ]),
  ).not.toThrow();
});

it('validates URLKit static search descriptors', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'articles.index',
        path: '/articles',
        search: {
          query: { type: 'string', optional: true },
          filters: { type: 'string', many: true, optional: true },
          requiredToken: { type: 'string' },
          page: { type: 'int', default: 1 },
          visible: { type: 'boolean', optional: true },
          publishedOn: { type: 'date', format: 'dd-MM-yyyy', optional: true },
          startsAt: {
            type: 'date-time',
            format: 'dd-MM-yyyy HH:mm:ss',
            optional: true,
          },
          sort: { type: 'enum', values: ['new', 'top'], optional: true },
        },
      },
    ]),
  ).not.toThrow();

  expect(() =>
    validateRoutes([{ id: 'direct', path: '/', search: { query: 'string' } } as never]),
  ).toThrow(UrlKitError);

  expect(() =>
    validateRoutes([{ id: 'good', path: '/', search: { query: { type: 'string' } } } as never]),
  ).not.toThrow();

  expect(() =>
    validateRoutes([{ id: 'bad', path: '/', search: { query: { value: 'object' } } } as never]),
  ).toThrow(UrlKitError);

  expect(() =>
    validateRoutes([
      { id: 'bad', path: '/', search: { query: { type: 'string', optional: 'yes' } } } as never,
    ]),
  ).toThrow(UrlKitError);

  expect(() =>
    validateRoutes([
      {
        id: 'bad',
        path: '/',
        search: {
          from: {
            type: 'date',
            format: {
              parse: (value: string) => new Date(value),
              serialize: (value: Date) => value.toISOString(),
            },
          },
        },
      } as never,
    ]),
  ).toThrow(UrlKitError);

  expect(() =>
    validateRoutes([
      {
        id: 'bad',
        path: '/',
        search: {
          from: {
            value: {
              type: 'date',
              format: 'dd-MM-yyyy',
            },
            optional: true,
          },
        },
      } as never,
    ]),
  ).toThrow(UrlKitError);

  expect(() =>
    validateRoutes([
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
    ]),
  ).toThrow('Date format contains unsupported token');
});

it('rejects layout fallbacks and slots when no layout view is in scope', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'standalone',
        path: '/standalone',
        view: {},
        layout: { loading: {}, error: {} },
      },
    ]),
  ).toThrow('no active layout view exists');

  expect(() =>
    validateRoutes([
      {
        id: 'standalone',
        path: '/standalone',
        view: {},
        layout: { slots: { modal: true } },
      },
    ]),
  ).toThrow('declares layout.slots');
});

it('rejects child slot declarations that do not target an active declared slot', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'users',
        path: '/users',
        layout: { view: {} },
        children: [
          {
            id: 'users.details',
            path: '{slug}',
            layout: { slots: { header: {} } },
          },
        ],
      },
    ]),
  ).toThrow(
    'Missing slot "header" for route "users.details". Declare "layout.slots.header" on an active ancestor layout or remove the child slot declaration.',
  );
});

it('allows child slot declarations when an ancestor layout declares the slot', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'users',
        path: '/users',
        layout: { view: {}, slots: { header: true } },
        children: [
          {
            id: 'users.details',
            path: '{slug}',
            layout: { slots: { header: {} } },
          },
        ],
      },
    ]),
  ).not.toThrow();
});

it('rejects intercepts targeting undeclared slots', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'overview',
        path: '/overview',
        layout: { view: {}, slots: { header: true } },
        intercepts: { modal: { to: 'create', view: {} } },
      },
      { id: 'create', path: '/create', view: {} },
    ]),
  ).toThrow(
    'Invalid intercept slot "modal" on route "overview". The route configures this intercept slot, but neither this route nor an active ancestor layout declares "layout.slots.modal". Declare the slot or remove the intercept slot configuration.',
  );
});

it('allows intercepts targeting declared slots', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'overview',
        path: '/overview',
        layout: { view: {}, slots: { modal: true } },
        intercepts: { modal: { to: 'create', view: {} } },
      },
      { id: 'create', path: '/create', view: {} },
    ]),
  ).not.toThrow();
});

it('rejects removed route and layout errorFallback properties', () => {
  expect(() =>
    validateRoutes([{ id: 'article', path: '/article', view: {}, errorFallback: {} } as never]),
  ).toThrow('route errorFallback is no longer supported');

  expect(() =>
    validateRoutes([
      {
        id: 'article',
        path: '/article',
        view: {},
        layout: { view: {}, errorFallback: {} },
      } as never,
    ]),
  ).toThrow('layout errorFallback is no longer supported');
});

it('rejects duplicate index children in static route trees', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        children: [
          { id: 'root.index', index: true },
          { id: 'root.home', index: true },
        ],
      },
    ]),
  ).toThrow('duplicate index routes');
});

it('rejects redirect routes with children in static route trees', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'entry',
        path: '/',
        redirect: { route: 'home' },
        children: [{ id: 'entry.child', path: 'child' }],
      },
    ]),
  ).toThrow('must not define children');
});

it('rejects static intercept targets that are missing from the resolved tree', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/',
        layout: {
          view: {},
          slots: { modal: true },
        },
        intercepts: {
          modal: { to: 'missing.route', view: {} },
        },
      },
    ]),
  ).toThrow('targets missing route "missing.route"');
});
