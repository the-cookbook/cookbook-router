import { describe, expect, test } from 'vitest';
import { validateRoutes } from './validate-routes';

describe('validateRoutes', () => {
  test('accepts valid route trees, slot defaults, declaration-only slots, and slot routes', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'dashboard',
          path: '/dashboard',
          layout: {
            component: {},
            slots: {
              sidebar: {
                component: {},
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

  test('rejects missing and duplicate route ids', () => {
    expect(() => validateRoutes([{ id: '', path: '/' }])).toThrow('non-empty string id');
    expect(() =>
      validateRoutes([
        { id: 'home', path: '/' },
        { id: 'home', path: '/home' },
      ]),
    ).toThrow('Duplicate route id');
  });

  test('rejects invalid index route shapes', () => {
    expect(() => validateRoutes([{ id: 'home', index: true, path: '/' }])).toThrow(
      'must not define path',
    );
    expect(() =>
      validateRoutes([{ id: 'home', index: true, children: [{ id: 'child', path: '/child' }] }]),
    ).toThrow('must not define children');
  });

  test('rejects empty paths and invalid pathkit patterns', () => {
    expect(() => validateRoutes([{ id: 'empty', path: '' }])).toThrow('empty path');
    expect(() => validateRoutes([{ id: 'bad', path: '/users/{id:number}' }])).toThrow(
      'Unknown constraint type',
    );
  });

  test('rejects duplicate absolute route paths', () => {
    expect(() =>
      validateRoutes([
        { id: 'one', path: '/same' },
        { id: 'two', path: '/same' },
      ]),
    ).toThrow('Duplicate route path "/same"');
  });

  test('validates leading-slash child paths relative to their parent route', () => {
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

  test('rejects invalid hash configuration', () => {
    expect(() => validateRoutes([{ id: 'empty-hash', path: '/', hash: [''] }])).toThrow(
      'empty or non-string hash value',
    );
    expect(() => validateRoutes([{ id: 'duplicate-hash', path: '/', hash: ['a', 'a'] }])).toThrow(
      'duplicate hash',
    );
  });

  test('rejects invalid slot names and removed slot forms', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'root',
          path: '/',
          layout: {
            component: {},
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
            component: {},
            slots: {
              sidebar: {
                id: 'root.sidebar',
                component: {},
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
            component: {},
            slots: {
              sidebar: {
                fallback: { component: {} },
              } as never,
            },
          },
        },
      ]),
    ).toThrow('slot fallbacks are no longer supported');
  });
});

test('rejects invalid slot object and routes configuration', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
          component: {},
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
          component: {},
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
          component: {},
          slots: {
            sidebar: {
              routes: [{ id: 'bad.slot', path: '/bad/{id:number}' }],
            },
          },
        },
      },
    ]),
  ).toThrow('Unknown constraint type');
});

test('allows a slot route to share the primary branch URL it decorates', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          component: {},
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

test('allows the same path in different layout slot scopes', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          component: {},
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

test('rejects duplicate route paths inside the same layout slot scope', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          component: {},
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

test('rejects malformed route redirect configuration', () => {
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

test('validates search param cardinality descriptors', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'articles.index',
        path: '/articles',
        search: {
          query: { type: 'one', optional: true },
          filters: { type: 'many', optional: true },
          requiredToken: { type: 'one' },
        },
      },
    ]),
  ).not.toThrow();

  expect(() =>
    validateRoutes([{ id: 'bad', path: '/', search: { query: 'string' } } as never]),
  ).toThrow('must use');

  expect(() =>
    validateRoutes([{ id: 'bad', path: '/', search: { query: { type: 'string' } } } as never]),
  ).toThrow('type must be "one" or "many"');

  expect(() =>
    validateRoutes([
      { id: 'bad', path: '/', search: { query: { type: 'one', optional: 'yes' } } } as never,
    ]),
  ).toThrow('optional must be a boolean');
});

test('rejects layout fallbacks and slots when no layout component is in scope', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'standalone',
        path: '/standalone',
        component: {},
        layout: { loading: {}, error: {} },
      },
    ]),
  ).toThrow('no active layout component exists');

  expect(() =>
    validateRoutes([
      {
        id: 'standalone',
        path: '/standalone',
        component: {},
        layout: { slots: { modal: true } },
      },
    ]),
  ).toThrow('declares layout.slots');
});

test('rejects child slot declarations that do not target an active declared slot', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'users',
        path: '/users',
        layout: { component: {} },
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

test('allows child slot declarations when an ancestor layout declares the slot', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'users',
        path: '/users',
        layout: { component: {}, slots: { header: true } },
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

test('rejects intercepts targeting undeclared slots', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'overview',
        path: '/overview',
        layout: { component: {}, slots: { header: true } },
        intercepts: { modal: { to: 'create', component: {} } },
      },
      { id: 'create', path: '/create', component: {} },
    ]),
  ).toThrow(
    'Invalid intercept slot "modal" on route "overview". The route configures this intercept slot, but neither this route nor an active ancestor layout declares "layout.slots.modal". Declare the slot or remove the intercept slot configuration.',
  );
});

test('allows intercepts targeting declared slots', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'overview',
        path: '/overview',
        layout: { component: {}, slots: { modal: true } },
        intercepts: { modal: { to: 'create', component: {} } },
      },
      { id: 'create', path: '/create', component: {} },
    ]),
  ).not.toThrow();
});

test('rejects removed route and layout errorFallback properties', () => {
  expect(() =>
    validateRoutes([
      { id: 'article', path: '/article', component: {}, errorFallback: {} } as never,
    ]),
  ).toThrow('route errorFallback is no longer supported');

  expect(() =>
    validateRoutes([
      {
        id: 'article',
        path: '/article',
        component: {},
        layout: { component: {}, errorFallback: {} },
      } as never,
    ]),
  ).toThrow('layout errorFallback is no longer supported');
});
