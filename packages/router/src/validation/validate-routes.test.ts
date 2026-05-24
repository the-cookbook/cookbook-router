import { describe, expect, test } from 'vitest';
import { validateRoutes } from './validate-routes';

describe('validateRoutes', () => {
  test('accepts valid route trees, slot fallbacks, and slot routes', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'dashboard',
          path: '/dashboard',
          layout: {
            slots: {
              sidebar: {
                fallback: {
                  id: 'dashboard.sidebar.fallback',
                  component: {},
                },
                routes: [
                  {
                    id: 'dashboard.sidebar.activity',
                    path: 'activity',
                  },
                ],
              },
              modal: {
                fallback: null,
              },
              disabled: false,
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

  test('rejects invalid hash configuration', () => {
    expect(() => validateRoutes([{ id: 'empty-hash', path: '/', hash: [''] }])).toThrow(
      'empty or non-string hash value',
    );
    expect(() => validateRoutes([{ id: 'duplicate-hash', path: '/', hash: ['a', 'a'] }])).toThrow(
      'duplicate hash',
    );
  });

  test('rejects invalid slot names and duplicate fallback ids', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'root',
          path: '/',
          layout: {
            slots: {
              '': {
                fallback: null,
              },
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
            slots: {
              sidebar: {
                fallback: {
                  id: 'root',
                  component: {},
                },
              },
            },
          },
        },
      ]),
    ).toThrow('Duplicate route id "root"');
  });
});

test('rejects invalid slot fallback and routes configuration', () => {
  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
          slots: {
            sidebar: {
              fallback: {} as never,
            },
          },
        },
      },
    ]),
  ).toThrow('fallback must define component');

  expect(() =>
    validateRoutes([
      {
        id: 'root',
        path: '/',
        layout: {
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
