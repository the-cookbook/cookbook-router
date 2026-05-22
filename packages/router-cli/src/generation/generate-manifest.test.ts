import { describe, expect, test } from 'vitest';
import { sampleRoutes } from '../test-helpers';
import { generateManifest, serializeManifest } from './generate-manifest';

describe('generateManifest', () => {
  test('generates manifest entries from normalized routes', () => {
    expect(generateManifest(sampleRoutes)).toEqual({
      routes: [
        { id: 'root', path: '/', index: false },
        { id: 'home', path: '/', parentId: 'root', index: true },
        { id: 'users.show', path: '/users/{id:int}', parentId: 'root', index: false },
      ],
    });
  });

  test('serializes generated manifest with a trailing newline', () => {
    const serialized = serializeManifest({ routes: [{ id: 'home', path: '/', index: true }] });

    expect(serialized.endsWith('\n')).toBe(true);
    expect(JSON.parse(serialized)).toEqual({ routes: [{ id: 'home', path: '/', index: true }] });
  });

  test('fails invalid routes before writing manifest content', () => {
    expect(() => generateManifest([{ id: 'bad', path: '/users/{id:int}/{id:int}' }])).toThrow(
      /Duplicate parameter 'id' found in the route '\/users\/\{id:int\}\/\{id:int\}'/,
    );
  });
});
