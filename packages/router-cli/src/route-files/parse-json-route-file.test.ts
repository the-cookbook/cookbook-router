import { describe, expect, it } from 'vitest';
import { parseJsonRouteFile } from './parse-json-route-file';

describe('parseJsonRouteFile', () => {
  it('parses a JSON route file', () => {
    expect(parseJsonRouteFile('routes.json', '{"routes":[]}')).toEqual({ routes: [] });
  });

  it('wraps invalid JSON errors', () => {
    expect(() => parseJsonRouteFile('routes.json', '{')).toThrow('contains invalid JSON');
  });
});
