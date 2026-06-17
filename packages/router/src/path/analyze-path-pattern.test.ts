import { describe, expect, it } from 'vitest';
import { analyzePathPattern } from './analyze-path-pattern';

describe('analyzePathPattern', () => {
  it('analyzes the root pattern', () => {
    expect(analyzePathPattern('/')).toEqual({ params: [], score: 0, depth: 0 });
  });

  it('calculates literal score and depth', () => {
    expect(analyzePathPattern('/users/settings')).toMatchObject({ score: 10, depth: 2 });
  });

  it('extracts required, optional, wildcard, and chained params', () => {
    expect(analyzePathPattern('/files/{type:list(image|video)}/{*path?}')).toEqual({
      score: 9,
      depth: 3,
      params: [
        {
          name: 'type',
          constraints: [{ type: 'list', params: 'image|video' }],
          wildcard: false,
          optional: false,
          token: '{type:list(image|video)}',
        },
        {
          name: 'path',
          constraints: [],
          wildcard: true,
          optional: true,
          token: '{*path?}',
        },
      ],
    });
  });

  it('preserves slash-like content inside constraint arguments', () => {
    expect(analyzePathPattern('/posts/{slug:regex([a-z]+/[0-9]+)}')).toMatchObject({
      score: 8,
      depth: 2,
      params: [
        {
          name: 'slug',
          constraints: [{ type: 'regex', params: '[a-z]+/[0-9]+' }],
          token: '{slug:regex([a-z]+/[0-9]+)}',
        },
      ],
    });
  });

  it('freezes returned metadata', () => {
    const analysis = analyzePathPattern('/users/{id:int}');
    const param = analysis.params[0];

    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.params)).toBe(true);
    expect(Object.isFrozen(param)).toBe(true);
    expect(Object.isFrozen(param?.constraints)).toBe(true);
    expect(Object.isFrozen(param?.constraints[0])).toBe(true);
  });
});
