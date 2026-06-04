import { describe, expect, it } from 'vitest';
import { renderRouteSearch, renderSearchFieldType } from './generate-route-search';

describe('generate-route-search', () => {
  it('renders URLKit scalar search value types', () => {
    expect(renderSearchFieldType('string')).toBe('string');
    expect(renderSearchFieldType('int')).toBe('number');
    expect(renderSearchFieldType('number')).toBe('number');
    expect(renderSearchFieldType('boolean')).toBe('boolean');
    expect(renderSearchFieldType('date')).toBe('Date');
  });

  it('renders many, optional, defaulted, and enum search descriptors', () => {
    expect(
      renderRouteSearch({
        page: { value: 'int', default: 1 },
        tags: { value: 'string', type: 'many' },
        featured: { value: 'boolean', optional: true },
        sort: { value: { type: 'enum', values: ['new', 'top'] }, optional: true },
      }),
    ).toBe("{ page: number; tags: readonly string[]; featured?: boolean; sort?: 'new' | 'top' }");
  });
});
