import { afterEach, describe, expect, test } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { createMemoryHistory } from '../history/memory-history';
import { createConstraint } from '../pathkit/pathkit';
import { defineRoutes } from '../routes/define-routes';
import { createRouter, deserializeRouterState, serializeRouterState } from './create-router';

const routes = defineRoutes([
  { id: 'home', path: '/' },
  { id: 'about', path: '/about' },
] as const);

afterEach(() => {
  resetConstraints();
});

describe('create-router', () => {
  test('uses provided history and exposes resolve helpers', async () => {
    const history = createMemoryHistory({ initialEntries: ['/about'] });
    const router = createRouter({ routes, history });

    expect(router.state.match?.route.id).toBe('about');
    expect(router.resolve('home').href).toBe('/');
    expect(router.href({ route: 'about' })).toBe('/about');
    expect(router.href('about', { context: { source: 'ignored' } })).toBe('/about');
    expect(router.match('/about')?.route.id).toBe('about');

    await router.navigate.to({ route: 'about' });
    expect(router.state.location.href).toBe('/about');

    const serialized = serializeRouterState(router);
    expect(deserializeRouterState(serialized)).toEqual(serialized);
  });

  test('registers custom path constraints before route validation and href generation', () => {
    const slug = createConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });
    const constrainedRoutes = defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const, {
      pathConstraints: { slug },
    });

    resetConstraints();

    const router = createRouter({
      routes: constrainedRoutes,
      history: createMemoryHistory({ initialEntries: ['/posts/hello-world'] }),
    });

    expect(router.state.match?.route.id).toBe('post');
    expect(router.href('post', { params: { slug: 'hello-world' } })).toBe('/posts/hello-world');
    expect(() => router.href('post', { params: { slug: 'HelloWorld' } })).toThrow('HelloWorld');
  });

  test('registers custom path constraints from createRouter for unvalidated route arrays', () => {
    const slug = createConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: () => {},
      toRegExp: () => '[a-z0-9-]+',
    });

    const router = createRouter({
      routes: [{ id: 'post', path: '/posts/{slug:slug}' }],
      history: createMemoryHistory({ initialEntries: ['/posts/hello-world'] }),
      pathConstraints: { slug },
    });

    expect(router.state.match?.route.id).toBe('post');
  });

  test('throws during route definition when an unknown custom constraint is not registered', () => {
    expect(() => defineRoutes([{ id: 'post', path: '/posts/{slug:slug}' }] as const)).toThrow(
      'Unknown constraint type: "slug"',
    );
  });
});
