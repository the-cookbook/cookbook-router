import { describe, expect, test } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { validateCommand } from './validate';

describe('validateCommand', () => {
  test('returns ok for valid in-memory routes', async () => {
    await expect(validateCommand({ routes: sampleRoutes })).resolves.toEqual({
      ok: true,
      files: [],
      errors: [],
    });
  });

  test('returns ok for valid route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(validateCommand({ routeFiles: ['routes.json'], fs })).resolves.toEqual({
      ok: true,
      files: [],
      errors: [],
    });
  });

  test('returns errors for duplicate route IDs', async () => {
    const result = await validateCommand({
      routes: [
        { id: 'x', path: '/x' },
        { id: 'x', path: '/y' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Duplicate route id');
  });
});
