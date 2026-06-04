import { describe, expect, it } from 'vitest';
import { createConstraint } from '@cookbook/router';
import { sampleRoutes } from '../test-helpers';
import { generateManifest, serializeManifest } from './generate-manifest';

describe('generateManifest', () => {
  it('generates manifest entries from normalized routes', () => {
    expect(generateManifest(sampleRoutes)).toEqual({
      routes: [
        { id: 'root', path: '/', index: false },
        { id: 'home', path: '/', parentId: 'root', index: true },
        { id: 'users.show', path: '/users/{id:int}', parentId: 'root', index: false },
      ],
    });
  });

  it('preserves route-level URL options in manifest entries', () => {
    expect(
      generateManifest([
        {
          id: 'products',
          path: '/products',
          url: { arrayFormat: 'comma' },
        },
      ]),
    ).toEqual({
      routes: [{ id: 'products', path: '/products', index: false, url: { arrayFormat: 'comma' } }],
    });
  });

  it('serializes generated manifest with a trailing newline', () => {
    const serialized = serializeManifest({ routes: [{ id: 'home', path: '/', index: true }] });

    expect(serialized.endsWith('\n')).toBe(true);
    expect(JSON.parse(serialized)).toEqual({ routes: [{ id: 'home', path: '/', index: true }] });
  });

  it('generates manifest with custom path constraints from defineRoutes options', () => {
    const manifest = generateManifest([{ id: 'post.show', path: '/posts/{slug:slug}' }], {
      pathConstraints: {
        slug: createConstraint({
          parse: () => undefined,
          verify: () => undefined,
          toRegExp: () => '[a-z0-9-]+',
        }),
      },
    } as never);

    expect(manifest.routes).toEqual([
      { id: 'post.show', path: '/posts/{slug:slug}', index: false },
    ]);
  });

  it('fails invalid routes before writing manifest content', () => {
    expect(() => generateManifest([{ id: 'bad', path: '/users/{id:int}/{id:int}' }])).toThrow(
      /Duplicate parameter 'id' found in the route '\/users\/\{id:int\}\/\{id:int\}'/,
    );
  });
});
