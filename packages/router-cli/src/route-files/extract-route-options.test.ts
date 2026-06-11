import { describe, expect, it } from 'vitest';
import { extractDefineRoutesOptionsLiteral, extractRouteOptions } from './extract-route-options';

describe('extract-route-options', () => {
  it('extracts inline defineRoutes options', () => {
    const source =
      'defineRoutes([{ id: "home", path: "/" }] as const, { pathOptions: { trailingSlash: "ignore" } });';
    const literal = extractDefineRoutesOptionsLiteral(source, source.indexOf(']') + 1);
    expect(literal).toBe('{ pathOptions: { trailingSlash: "ignore" } }');
  });

  it('extracts statically declared path constraints as CLI-safe constraints', () => {
    const contents =
      'const constraints = { slug: createConstraint({}) }; defineRoutes([], { pathConstraints: constraints });';
    const options = extractRouteOptions('routes.ts', contents, '{ pathConstraints: constraints }');
    expect(options?.pathConstraints).toHaveProperty('slug');
  });
});
