import { describe, expect, it } from 'vitest';
import { normalizePathOptions } from '../path';
import { normalizeRoutes } from '../route-config/normalize-routes';
import { createRouterMatcher } from './router-matcher';

describe('createRouterMatcher', () => {
  it('matches hrefs against normalized routes', () => {
    const pathOptions = normalizePathOptions();
    const routes = normalizeRoutes(
      [
        {
          id: 'home',
          path: '/',
        },
      ],
      pathOptions,
    );
    const matcher = createRouterMatcher({ routes, pathOptions });

    expect(matcher.matchHref('/')).toMatchObject({ id: 'home' });
    expect(matcher.matchHref('/missing')).toBeNull();
  });

  it('returns match result diagnostics for invalid URL state', () => {
    const pathOptions = normalizePathOptions();
    const routes = normalizeRoutes(
      [
        {
          id: 'reports',
          path: '/reports',
          search: {
            page: { type: 'int' },
          },
        },
      ],
      pathOptions,
    );
    const matcher = createRouterMatcher({ routes, pathOptions });

    expect(matcher.matchHrefResult('/reports?page=1').status).toBe('matched');
  });
});
