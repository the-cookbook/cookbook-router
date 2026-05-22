import { describe, expect, test } from 'vitest';
import { validateRoutes } from './validate-routes';

describe('validate-routes hardening', () => {
  test('rejects malformed top-level route collections', () => {
    expect(() => validateRoutes({} as never)).toThrow('Router routes must be an array');
  });

  test('rejects malformed search and meta configuration', () => {
    expect(() => validateRoutes([{ id: 'home', path: '/', search: [] as never }])).toThrow(
      'search configuration must be an object',
    );
    expect(() => validateRoutes([{ id: 'home', path: '/', meta: [] as never }])).toThrow(
      'meta must be an object',
    );
  });

  test('rejects hash contracts with a leading number sign', () => {
    expect(() => validateRoutes([{ id: 'home', path: '/', hash: ['#profile'] }])).toThrow(
      'must not include a leading #',
    );
  });

  test('does not treat pathless layouts as duplicate URL declarations', () => {
    expect(() =>
      validateRoutes([
        {
          id: 'root',
          path: '/organizations/{organizationId:int}',
          children: [
            {
              id: 'layout',
              layout: {},
              children: [{ id: 'users', path: 'users/{userId:int}' }],
            },
          ],
        },
      ]),
    ).not.toThrow();
  });
});
