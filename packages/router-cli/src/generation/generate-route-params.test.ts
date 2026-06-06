import { describe, expect, it } from 'vitest';
import { renderParamType, renderRouteParams } from './generate-route-params';

describe('generate-route-params', () => {
  it('renders URLKit numeric built-in constraints as numbers', () => {
    expect(renderParamType({ name: 'id', constraint: 'int', token: '{id:int}' })).toBe('number');
    expect(renderParamType({ name: 'price', constraint: 'decimal', token: '{price:decimal' })).toBe(
      'number',
    );
    expect(
      renderParamType({ name: 'quantity', constraint: 'range', token: '{quantity:range(1,10)}' }),
    ).toBe('number');
  });

  it('renders custom and wildcard constraints as strings', () => {
    expect(renderParamType({ name: 'slug', constraint: 'slug', token: '{slug:slug}' })).toBe(
      'string',
    );
    expect(renderParamType({ name: 'path', constraint: 'wildcard', token: '{*path}' })).toBe(
      'string',
    );
  });

  it('renders an inline params object', () => {
    expect(
      renderRouteParams([
        { name: 'id', constraint: 'int', token: '{id:int}' },
        { name: 'price', constraint: 'decimal', token: '{price:decimal}' },
        { name: 'quantity', constraint: 'range', token: '{quantity:range(1,10)}' },
        { name: 'bad-key', constraint: 'string', token: '{bad-key}' },
      ]),
    ).toBe("{ id: number; price: number; quantity: number; 'bad-key': string }");
  });
});
