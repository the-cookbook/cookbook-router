import { afterEach, describe, expect, it } from 'vitest';
import { resetConstraints } from '@cookbook/pathkit';
import { hasPathConstraint } from '@cookbook/urlkit/router-runtime';
import { compilePathPattern, createConstraint, matchPathPattern } from '../path';
import { registerUrlPathConstraints } from './register-url-path-constraints';

afterEach(() => {
  resetConstraints();
});

describe('registerUrlPathConstraints', () => {
  it('registers custom constraints with PathKit and URLKit', () => {
    const slug = createConstraint({
      parse: (paramName, value) => {
        if (typeof value !== 'string' || !/^[a-z0-9-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a valid slug`);
        }
      },
      verify: (_paramName, params) => {
        if (params) {
          throw new Error('slug does not accept parameters');
        }
      },
      toRegExp: () => '[a-z0-9-]+',
    });

    registerUrlPathConstraints({ router_shared_slug: slug });

    expect(hasPathConstraint('router_shared_slug')).toBe(true);
    expect(matchPathPattern('/posts/{slug:router_shared_slug}', '/posts/hello-world')).toEqual({
      slug: 'hello-world',
    });
    expect(compilePathPattern('/posts/{slug:router_shared_slug}', { slug: 'hello-world' })).toBe(
      '/posts/hello-world',
    );
  });
});
