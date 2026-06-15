import { describe, expect, it } from 'vitest';
import { extractDefineRoutesOptionsLiteral, extractRouteOptions } from './extract-route-options';

describe('extract-route-options', () => {
  it('extracts inline defineRoutes options', () => {
    const source =
      'defineRoutes([{ id: "home", path: "/" }] as const, { pathOptions: { prune: "all" } });';
    const literal = extractDefineRoutesOptionsLiteral(source, source.indexOf(']') + 1);
    expect(literal).toBe('{ pathOptions: { prune: "all" } }');
  });

  it('extracts statically declared path constraints as CLI-safe constraints', () => {
    const contents =
      'const constraints = { slug: createPathConstraint({}) }; defineRoutes([], { pathConstraints: constraints });';
    const options = extractRouteOptions('routes.ts', contents, '{ pathConstraints: constraints }');
    expect(options?.pathConstraints).toHaveProperty('slug');
  });

  it('supports shorthand pathConstraints route options', () => {
    const contents =
      'const pathConstraints = { slug: createPathConstraint({}) }; defineRoutes([], { pathConstraints });';
    const options = extractRouteOptions('routes.ts', contents, '{ pathConstraints }');
    expect(options?.pathConstraints).toHaveProperty('slug');
  });

  it('supports typed static route option declarations', () => {
    const contents =
      'const constraints: Record<string, unknown> = { slug: createPathConstraint({}) }; defineRoutes([], routeOptions);';
    const options = extractRouteOptions('routes.ts', contents, '{ pathConstraints: constraints }');
    expect(options?.pathConstraints).toHaveProperty('slug');
  });

  it('supports const assertions in pathOptions literals', () => {
    const options = extractRouteOptions(
      'routes.ts',
      '',
      '{ pathOptions: { prune: "all" } as const }',
    );

    expect(options?.pathOptions).toEqual({ prune: 'all' });
  });

  it('supports static pathOptions route option declarations', () => {
    const contents =
      'const pathOptions = { prune: "all" } as const; defineRoutes([], { pathOptions });';
    const options = extractRouteOptions('routes.ts', contents, '{ pathOptions }');
    expect(options?.pathOptions).toEqual({ prune: 'all' });
  });
});
