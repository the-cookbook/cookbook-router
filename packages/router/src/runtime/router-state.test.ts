import { describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import type { RouteMatch } from '../route-config/contracts';
import { createRouterState } from './router-state';

describe('createRouterState', () => {
  it('creates state with a null match for route misses', () => {
    const location = parseHref('/missing');

    expect(
      createRouterState({
        location,
        navigation: 'idle',
        matchHrefResult: () => ({ status: 'no-match' }),
      }),
    ).toEqual({ location, match: null, navigation: 'idle' });
  });

  it('attaches match errors to state', () => {
    const location = parseHref('/broken');
    const error = new Error('broken search');

    expect(
      createRouterState({
        location,
        navigation: 'error',
        matchHrefResult: () => ({ status: 'error', match: {} as RouteMatch, error }),
      }),
    ).toMatchObject({ location, navigation: 'error', error });
  });
});
