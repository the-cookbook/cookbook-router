import { describe, expect, it } from 'vitest';
import { sampleRoutes } from '../test-helpers';
import { generateContracts } from './generate-contracts';

describe('generateContracts', () => {
  it('generates route contract interfaces', () => {
    const output = generateContracts(sampleRoutes);

    expect(output.startsWith('/* eslint-disable */\n')).toBe(true);
    expect(output).toContain('export interface RouteParams');
    expect(output.trimEnd().endsWith('/* eslint-enable */')).toBe(true);
    expect(output).toContain("'users.show': { id: string };");
    expect(output).toContain('tab?: string');
    expect(output).toContain('page?: string');
    expect(output).toContain('filters?: string | readonly string[]');
    expect(output).toContain("'profile' | 'settings'");
    expect(output).toContain("'users.show': '/users/{id:int}';");
    expect(output).toContain('outletContext: RouteOutletContext;');
    expect(output).toContain("export const routeIds = ['root', 'home', 'users.show'] as const;");
    expect(output).toContain('export const routePaths = {');
  });

  it('generates empty contracts for routes without optional URL state', () => {
    const output = generateContracts([{ id: 'about', path: '/about' }]);

    expect(output).toContain('about: {};');
    expect(output).toContain('about: never;');
    expect(output).toContain("about: '/about';");
    expect(output).toContain("export const routeIds = ['about'] as const;");
    expect(output).toContain('/* eslint-disable */');
    expect(output).toContain('/* eslint-enable */');
  });

  it('quotes invalid TypeScript property names', () => {
    const output = generateContracts([
      { id: 'blog.posts.show', path: '/blog/{slug:regex([a-z0-9-]+)}' },
    ]);

    expect(output).toContain("'blog.posts.show': { slug: string };");
    expect(output).toContain('slug: string');
  });

  it('generates contracts for slot routes and declaration-only slots', () => {
    const output = generateContracts([
      {
        id: 'dashboard',
        path: '/dashboard',
        layout: {
          component: () => null,
          slots: {
            sidebar: {
              component: () => null,
              routes: [{ id: 'dashboard.sidebar.activity', path: 'activity/{itemId:int}' }],
            },
            modal: true,
          },
        },
        children: [{ id: 'dashboard.home', index: true }],
      },
    ] as never);

    expect(output).toContain("'dashboard.sidebar.activity': { itemId: string };");
    expect(output).toContain("'dashboard.sidebar.activity': '/dashboard/activity/{itemId:int}';");
  });

  it('throws for invalid route configuration', () => {
    expect(() => generateContracts([{ id: 'bad', index: true, path: '/bad' }])).toThrow('index');
    expect(() =>
      generateContracts([{ id: 'bad', path: '/', search: { query: 'string' } } as never]),
    ).toThrow('must use');
  });
});
