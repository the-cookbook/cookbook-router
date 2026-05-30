import { describe, expect, it } from 'vitest';
import { resolveSafeStaticUrl } from './ssr-request';

describe('safe SSR request URLs', () => {
  it('normalizes absolute and relative HTTP URLs to pathname search hash', () => {
    expect(resolveSafeStaticUrl('/users/1?tab=settings#profile')).toBe(
      '/users/1?tab=settings#profile',
    );
    expect(resolveSafeStaticUrl(new URL('https://example.com/app?q=1#hash'))).toBe('/app?q=1#hash');
  });

  it('rejects non-HTTP protocols before static request handling', () => {
    expect(() => resolveSafeStaticUrl('javascript:alert(1)')).toThrow(
      'Static router URL must use http, https, or a relative path',
    );
    expect(() => resolveSafeStaticUrl(new URL('file:///etc/passwd'))).toThrow(
      'Static router URL must use http, https, or a relative path',
    );
  });
});
