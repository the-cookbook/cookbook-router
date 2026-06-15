import { describe, expect, it } from 'vitest';
import {
  renderRouteSearch,
  renderRouteSearchInput,
  renderSearchFieldType,
} from './generate-route-search';

describe('generate-route-search', () => {
  it('renders URLKit scalar search value types', () => {
    expect(renderSearchFieldType({ type: 'string' })).toBe('string');
    expect(renderSearchFieldType({ type: 'int' })).toBe('number');
    expect(renderSearchFieldType({ type: 'number' })).toBe('number');
    expect(renderSearchFieldType({ type: 'boolean' })).toBe('boolean');
    expect(renderSearchFieldType({ type: 'date' })).toBe('Date');
    expect(renderSearchFieldType({ type: 'date', format: 'unix-seconds' })).toBe('Date');
    expect(renderSearchFieldType({ type: 'date', format: 'unix-ms' })).toBe('Date');
    expect(renderSearchFieldType({ type: 'date', format: 'dd-MM-yyyy' })).toBe('Date');
    expect(renderSearchFieldType({ type: 'date-time', format: 'dd-MM-yyyy HH:mm:ss' })).toBe(
      'Date',
    );
  });

  it('renders many, optional, defaulted, and enum parsed-search descriptors', () => {
    expect(
      renderRouteSearch({
        page: { type: 'int', default: 1 },
        tags: { type: 'string', many: true },
        featured: { type: 'boolean', optional: true },
        sort: { type: 'enum', values: ['new', 'top'], optional: true },
      }),
    ).toBe("{ page: number; tags: readonly string[]; featured?: boolean; sort?: 'new' | 'top' }");
  });

  it('renders search input descriptors with defaults as optional', () => {
    expect(
      renderRouteSearchInput({
        page: { type: 'int', default: 1 },
        tags: { type: 'string', many: true },
        featured: { type: 'boolean', optional: true },
      }),
    ).toBe('{ page?: number; tags: readonly string[]; featured?: boolean }');
  });
});
