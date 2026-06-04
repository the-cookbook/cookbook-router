import { describe, expect, it } from 'vitest';
import { applyBasename, normalizeBasename, stripBasename } from './pathname';

describe('pathname helpers', () => {
  it('normalizes basenames to a leading slash without a trailing slash', () => {
    expect(normalizeBasename()).toBe('');
    expect(normalizeBasename('/')).toBe('');
    expect(normalizeBasename('app/')).toBe('/app');
    expect(normalizeBasename('/app/')).toBe('/app');
  });

  it('applies and strips basenames around app-relative paths', () => {
    expect(applyBasename('/', '/app')).toBe('/app');
    expect(applyBasename('/users', '/app')).toBe('/app/users');
    expect(stripBasename('/app', '/app')).toBe('/');
    expect(stripBasename('/app/users', '/app')).toBe('/users');
    expect(stripBasename('/other/users', '/app')).toBe('/other/users');
  });
});
