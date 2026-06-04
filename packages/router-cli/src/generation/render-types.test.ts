import { describe, expect, it } from 'vitest';
import { quote, quoteProperty, renderInterface, renderObject } from './render-types';

describe('render type helpers', () => {
  it('renders generated interfaces and object literals with quoted route ids', () => {
    expect(
      renderInterface('RouteParams', [
        ['home', '{}'],
        ['users.show', '{ id: number }'],
      ]),
    ).toBe("export interface RouteParams {\n  home: {};\n  'users.show': { id: number };\n}");

    expect(renderObject(['id: number', 'tab?: string'])).toBe('{ id: number; tab?: string }');
    expect(renderObject([])).toBe('{}');
  });

  it('quotes generated string literals and invalid property names safely', () => {
    expect(quote("users' detail")).toBe("'users\\' detail'");
    expect(quoteProperty('users')).toBe('users');
    expect(quoteProperty('users.show')).toBe("'users.show'");
  });
});
