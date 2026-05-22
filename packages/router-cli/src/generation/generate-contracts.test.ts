import { describe, expect, test } from 'vitest';
import { sampleRoutes } from '../test-helpers';
import { generateContracts } from './generate-contracts';

describe('generateContracts', () => {
  test('generates route contract interfaces', () => {
    const output = generateContracts(sampleRoutes);

    expect(output.startsWith('/* eslint-disable */\n')).toBe(true);
    expect(output).toContain('export interface RouteParams');
    expect(output.trimEnd().endsWith('/* eslint-enable */')).toBe(true);
    expect(output).toContain("'users.show': { id: string };");
    expect(output).toContain('tab?: string');
    expect(output).toContain('page?: string');
    expect(output).toContain("'profile' | 'settings'");
    expect(output).toContain("'users.show': '/users/{id:int}';");
    expect(output).toContain('outletContext: RouteOutletContext;');
    expect(output).toContain("export const routeIds = ['root', 'home', 'users.show'] as const;");
    expect(output).toContain('export const routePaths = {');
  });

  test('generates empty contracts for routes without optional URL state', () => {
    const output = generateContracts([{ id: 'about', path: '/about' }]);

    expect(output).toContain('about: {};');
    expect(output).toContain('about: never;');
    expect(output).toContain("about: '/about';");
    expect(output).toContain("export const routeIds = ['about'] as const;");
    expect(output).toContain('/* eslint-disable */');
    expect(output).toContain('/* eslint-enable */');
  });

  test('quotes invalid TypeScript property names', () => {
    const output = generateContracts([
      { id: 'blog.posts.show', path: '/blog/{slug:regex([a-z0-9-]+)}' },
    ]);

    expect(output).toContain("'blog.posts.show': { slug: string };");
    expect(output).toContain('slug: string');
  });

  test('throws for invalid route configuration', () => {
    expect(() => generateContracts([{ id: 'bad', index: true, path: '/bad' }])).toThrow('index');
  });
});
