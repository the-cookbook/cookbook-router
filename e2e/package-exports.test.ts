import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  createMemoryRouter,
  createRouter,
  createStaticRouter,
  createUnknownRouteError,
  defineRoutes,
  deserializeRouterState,
  matchRoutes,
  serializeRouterState,
  stringifyRouterState,
  validateRoutes,
  type RouteUrlOptions,
  type Router,
} from '@cookbook/router';
import {
  Link,
  NavLink,
  Outlet,
  RouterProvider,
  Slot,
  StaticRouterProvider,
  useHash,
  useHref,
  useLocation,
  useMatches,
  useNavigate,
  useNavigation,
  useOutletContext,
  useParams,
  useRouter,
  useSearch,
} from '@cookbook/router-react';
import {
  generateCommand,
  generateContracts,
  generateManifest,
  manifestCommand,
  runCli,
  validateCommand,
  watchCommand,
} from '@cookbook/router-cli';
import type { RouterContracts as BlogContracts } from '../examples/react-blog/.cookbook-router/contracts';

const exportedFunctions = [
  createMemoryRouter,
  createRouter,
  createStaticRouter,
  createUnknownRouteError,
  defineRoutes,
  deserializeRouterState,
  matchRoutes,
  serializeRouterState,
  stringifyRouterState,
  validateRoutes,
  Link,
  NavLink,
  Outlet,
  RouterProvider,
  Slot,
  StaticRouterProvider,
  useHash,
  useHref,
  useLocation,
  useMatches,
  useNavigate,
  useNavigation,
  useOutletContext,
  useParams,
  useRouter,
  useSearch,
  generateCommand,
  generateContracts,
  generateManifest,
  manifestCommand,
  runCli,
  validateCommand,
  watchCommand,
];

describe('package exports and generated contract types', () => {
  test('all public workspace package exports are importable', () => {
    expect(exportedFunctions.every((value) => typeof value === 'function')).toBe(true);
  });

  test('generated blog contracts expose route IDs, params, search, hash, meta, paths, and outlet context', () => {
    expectTypeOf<keyof BlogContracts['params']>().toEqualTypeOf<
      'blog' | 'blog.index' | 'blog.posts.show'
    >();
    expectTypeOf<BlogContracts['params']['blog.posts.show']>().toEqualTypeOf<{ slug: string }>();
    expectTypeOf<BlogContracts['search']['blog.posts.show']>().toEqualTypeOf<{ ref?: string }>();
    expectTypeOf<BlogContracts['hash']['blog.posts.show']>().toEqualTypeOf<'comments' | 'share'>();
    expectTypeOf<BlogContracts['meta']['blog.posts.show']>().toEqualTypeOf<{ title?: string }>();
    expectTypeOf<
      BlogContracts['paths']['blog.posts.show']
    >().toEqualTypeOf<'/blog/{slug:regex([a-z0-9-]+)}'>();
    expectTypeOf<BlogContracts['outletContext']>().toMatchTypeOf<Record<string, unknown>>();
    expectTypeOf<RouteUrlOptions<'blog.posts.show'>>().toMatchTypeOf<{
      readonly params?: { slug: string };
      readonly search?: { ref?: string };
      readonly hash?: 'comments' | 'share' | '#comments' | '#share' | null;
    }>();
  });

  test('workspace router package returns the runtime contract from public API', () => {
    const routes = defineRoutes([{ id: 'home', path: '/' }] as const);
    const router = createMemoryRouter({ routes });

    expectTypeOf(router).toMatchTypeOf<Router>();
    expect(router.href('home')).toBe('/');
    expect(router.href({ route: 'home' })).toBe('/');
    expect(createUnknownRouteError('missing').message).toContain('not registered');
  });
});
