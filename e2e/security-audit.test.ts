import { describe, expect, it } from 'vitest';
import {
  createMemoryRouter,
  createStaticRouter,
  defineRoutes,
  deserializeRouterState,
  stringifyRouterState,
} from '@cookbook/router';
import { generateCommand } from '@cookbook/router-cli';

const routes = defineRoutes([
  { id: 'home', path: '/' },
  {
    id: 'user',
    path: '/users/{id:int}',
    hash: { type: 'enum', values: ['profile'], optional: true },
    search: { tab: { type: 'string', optional: true } },
  },
] as const);

describe('repository security audit regressions', () => {
  it('hydration state can be embedded in HTML without script injection', async () => {
    const router = createMemoryRouter({
      routes,
      initialEntries: ['/users/1?tab=</script>#profile'],
    });
    await router.start();

    const serialized = stringifyRouterState(router);

    expect(serialized).not.toContain('</script>');
    expect(deserializeRouterState(serialized).location.href).toBe(
      '/users/1?tab=%3C/script%3E#profile',
    );
  });

  it('SSR request handling rejects executable protocols', () => {
    expect(() => createStaticRouter({ routes, url: 'javascript:alert(1)' })).toThrow(
      'Static router URL must use http, https',
    );
  });

  it('CLI generation refuses unsafe write targets', async () => {
    const result = await generateCommand({ routes, outDir: 'bad\0dir' });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('null byte');
  });

  it('redirect loops still fail closed as navigation errors', async () => {
    const router = createMemoryRouter({
      routes,
      middleware: [({ redirect }) => redirect('/users/1')],
    });
    await router.navigate.to('home');

    expect(router.state.navigation).toBe('error');
    expect(String(router.state.error)).toContain('maximum redirect count');
  });
});
