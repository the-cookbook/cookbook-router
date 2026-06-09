import { describe, expect, it } from 'vitest';
import { renderParamType, renderRouteParams } from './generate-route-params';

function param(
  name: string,
  constraints: readonly string[],
  token: string,
  options: { readonly optional?: boolean; readonly wildcard?: boolean } = {},
) {
  return {
    name,
    constraints: constraints.map((type) => ({ type, params: '' })),
    wildcard: options.wildcard === true,
    optional: options.optional === true,
    token,
  };
}

describe('generate-route-params', () => {
  it('renders URLKit numeric built-in constraints as numbers', () => {
    expect(renderParamType(param('id', ['int'], '{id:int}'))).toBe('number');
    expect(renderParamType(param('price', ['decimal'], '{price:decimal}'))).toBe('number');
    expect(renderParamType(param('quantity', ['range'], '{quantity:range(1,10)}'))).toBe('number');
    expect(renderParamType(param('minPrice', ['min'], '{minPrice:min(1)}'))).toBe('number');
    expect(renderParamType(param('maxPrice', ['max'], '{maxPrice:max(10)}'))).toBe('number');
  });

  it('renders numeric path constraints from the full chain regardless of position', () => {
    expect(renderParamType(param('id', ['regex', 'min'], '{id:regex(\\d):min(1)}'))).toBe('number');
    expect(renderParamType(param('id', ['min', 'regex'], '{id:min(1):regex(\\d)}'))).toBe('number');
    expect(
      renderParamType(param('price', ['decimal', 'min', 'max'], '{price:decimal:min(1):max(10)}')),
    ).toBe('number');
  });

  it('renders string-like built-in, custom, and wildcard constraints as strings', () => {
    expect(renderParamType(param('id', ['uuid'], '{id:uuid}'))).toBe('string');
    expect(
      renderParamType(
        param('slug', ['minlength', 'maxlength'], '{slug:minlength(3):maxlength(50)}'),
      ),
    ).toBe('string');
    expect(renderParamType(param('view', ['list'], '{view:list(grid|list)}'))).toBe('string');
    expect(renderParamType(param('slug', ['slug'], '{slug:slug}'))).toBe('string');
    expect(renderParamType(param('path', [], '{*path}', { wildcard: true }))).toBe('string');
  });

  it('renders an inline params object', () => {
    expect(
      renderRouteParams([
        param('id', ['int'], '{id:int}'),
        param('price', ['decimal'], '{price:decimal}'),
        param('quantity', ['range'], '{quantity:range(1,10)}'),
        param('bad-key', [], '{bad-key}'),
        param('page', ['min'], '{page:min(1)?}', { optional: true }),
      ]),
    ).toBe("{ id: number; price: number; quantity: number; 'bad-key': string; page?: number }");
  });
});
