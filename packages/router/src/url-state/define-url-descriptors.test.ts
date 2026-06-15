import { describe, expect, it } from 'vitest';
import { defineHash, defineSearch, mergeSearch } from './define-url-descriptors';

describe('define URL descriptors', () => {
  it('preserves reusable search descriptor literals', () => {
    const search = defineSearch({
      page: { type: 'number', optional: true },
      q: { type: 'string', optional: true },
    } as const);

    expect(search).toEqual({
      page: { type: 'number', optional: true },
      q: { type: 'string', optional: true },
    });
  });

  it('merges search descriptors without mutating the inputs', () => {
    const pagination = defineSearch({ page: { type: 'number', optional: true } } as const);
    const filters = defineSearch({ status: { type: 'string', optional: true } } as const);

    expect(mergeSearch(pagination, filters)).toEqual({
      page: { type: 'number', optional: true },
      status: { type: 'string', optional: true },
    });
    expect(pagination).toEqual({ page: { type: 'number', optional: true } });
  });

  it('rejects duplicate search descriptor keys', () => {
    expect(() =>
      mergeSearch(
        { page: { type: 'number', optional: true } },
        { page: { type: 'string', optional: true } },
      ),
    ).toThrow('Duplicate search descriptor key "page"');
  });

  it('preserves hash descriptor literals', () => {
    const hash = defineHash({
      type: 'enum',
      values: ['comments', 'share'],
      optional: true,
    } as const);

    expect(hash).toEqual({ type: 'enum', values: ['comments', 'share'], optional: true });
  });
});
