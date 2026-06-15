import { describe, expect, it } from 'vitest';
import { createPathConstraint } from '@cookbook/router';
import { sampleRoutes } from '../test-helpers';
import { generateContracts } from './generate-contracts';

describe('generateContracts', () => {
  it('generates route contract interfaces', () => {
    const output = generateContracts(sampleRoutes);

    expect(output.startsWith('/* eslint-disable */\n')).toBe(true);
    expect(output).toContain('export interface RouteParams');
    expect(output.trimEnd().endsWith('/* eslint-enable */')).toBe(true);
    expect(output).toContain("'users.show': { id: number };");
    expect(output).toContain('tab?: string');
    expect(output).toContain('page?: string');
    expect(output).toContain('filters?: readonly string[]');
    expect(output).toContain("'profile' | 'settings'");
    expect(output).toContain("'users.show': '/users/{id:int}';");
    expect(output).toContain('paramsInput: RouteParamsInput;');
    expect(output).toContain('searchInput: RouteSearchInput;');
    expect(output).toContain('outletContext: RouteOutletContext;');
    expect(output).not.toContain('export const routeIds');
    expect(output).not.toContain('export const routePaths');
  });

  it('generates empty contracts for routes without optional URL state', () => {
    const output = generateContracts([{ id: 'about', path: '/about' }]);

    expect(output).toContain('about: {};');
    expect(output).toContain('about: never;');
    expect(output).toContain("about: '/about';");
    expect(output).not.toContain('export const routeIds');
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
          view: () => null,
          slots: {
            sidebar: {
              view: () => null,
              routes: [{ id: 'dashboard.sidebar.activity', path: 'activity/{itemId:int}' }],
            },
            modal: true,
          },
        },
        children: [{ id: 'dashboard.home', index: true }],
      },
    ] as never);

    expect(output).toContain("'dashboard.sidebar.activity': { itemId: number };");
    expect(output).toContain("'dashboard.sidebar.activity': '/dashboard/activity/{itemId:int}';");
  });

  it('infers URLKit parsed params and static search descriptor types', () => {
    const output = generateContracts([
      {
        id: 'products.show',
        path: '/products/{price:int}',
        search: {
          page: { type: 'int', default: 1 },
          featured: { type: 'boolean', optional: true },
          tags: { type: 'string', many: true },
          sort: { type: 'enum', values: ['new', 'top'], optional: true },
        },
        hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
      },
    ]);

    expect(output).toContain("'products.show': { price: number };");
    expect(output).toContain(
      "'products.show': { page: number; featured?: boolean; tags: readonly string[]; sort?: 'new' | 'top' };",
    );
    expect(output).toContain(
      "'products.show': { page?: number; featured?: boolean; tags: readonly string[]; sort?: 'new' | 'top' };",
    );
    expect(output).toContain("'products.show': 'details' | 'reviews' | undefined;");
  });

  it('infers params from full PathKit constraint chains', () => {
    const output = generateContracts([
      { id: 'bounded.price', path: '/prices/{price:decimal:min(1):max(10)}' },
      { id: 'numeric.regex', path: '/scores/{id:regex(\\d):min(1)}' },
      { id: 'uuid.user', path: '/users/{id:uuid}' },
      { id: 'bounded.slug', path: '/articles/{slug:minlength(3):maxlength(50)}' },
      { id: 'optional.page', path: '/pages/{page:min(1)?}' },
    ]);

    expect(output).toContain("'bounded.price': { price: number };");
    expect(output).toContain("'numeric.regex': { id: number };");
    expect(output).toContain("'uuid.user': { id: string };");
    expect(output).toContain("'bounded.slug': { slug: string };");
    expect(output).toContain("'optional.page': { page?: number };");
  });

  it('generates stable wildcard array params and flexible wildcard input params', () => {
    const output = generateContracts([{ id: 'files', path: '/files/{*path}' }]);

    expect(output).toContain('files: { path: readonly string[] };');
    expect(output).toContain('files: { path: string | readonly string[] };');
    expect(output).toContain('paramsInput: RouteParamsInput;');
  });

  it('keeps custom path constraints as strings in generated params', () => {
    const output = generateContracts([{ id: 'post.show', path: '/posts/{slug:slug}' }], {
      pathConstraints: {
        slug: createPathConstraint({
          parse: () => undefined,
          verify: () => undefined,
          toRegExp: () => '[a-z0-9-]+',
        }),
      },
    } as never);

    expect(output).toContain("'post.show': { slug: string };");
  });

  it('throws for invalid route configuration', () => {
    expect(() => generateContracts([{ id: 'bad', index: true, path: '/bad' }])).toThrow('index');
  });
});
