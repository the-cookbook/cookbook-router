import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { validateCommand } from './validate';

describe('validateCommand', () => {
  it('returns ok for valid in-memory routes', async () => {
    await expect(validateCommand({ routes: sampleRoutes })).resolves.toEqual({
      ok: true,
      files: [],
      errors: [],
    });
  });

  it('returns ok for valid route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(validateCommand({ routeFiles: ['routes.json'], fs })).resolves.toEqual({
      ok: true,
      files: [],
      errors: [],
    });
  });

  it('returns errors for duplicate route IDs', async () => {
    const result = await validateCommand({
      routes: [
        { id: 'x', path: '/x' },
        { id: 'x', path: '/y' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Duplicate route id');
  });

  it('validates route files with custom path constraints from defineRoutes options', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}' },
] as const, {
  pathConstraints: constraints,
});
`,
    });

    await expect(validateCommand({ routeFiles: ['routes.tsx'], fs })).resolves.toEqual({
      ok: true,
      files: [],
      errors: [],
    });
  });
});
