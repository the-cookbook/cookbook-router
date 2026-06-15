import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from './test-helpers';
import {
  generateCommand,
  generateContracts,
  generateManifest,
  initCommand,
  runCli,
  validateCommand,
  watchCommand,
} from './index';

describe('package entrypoint', () => {
  it('exports CLI commands and generators', () => {
    expect(generateCommand).toBeTypeOf('function');
    expect(validateCommand).toBeTypeOf('function');
    expect(initCommand).toBeTypeOf('function');
    expect(watchCommand).toBeTypeOf('function');
    expect(generateContracts(sampleRoutes)).toContain('RouterContracts');
    expect(generateManifest(sampleRoutes).routes.map((route) => route.id)).toContain('users.show');
  });

  it('returns failure for unknown CLI command', async () => {
    await expect(runCli(['unknown'])).resolves.toBe(1);
  });

  it('returns failure when validate has no route file option', async () => {
    await expect(runCli(['validate'])).resolves.toBe(1);
  });

  it('parses validate CLI command with a route file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-cli-'));
    const routeFile = join(dir, 'routes.json');

    try {
      await writeFile(routeFile, JSON.stringify({ routes: sampleRoutes }));

      await expect(runCli(['validate', '--routes', routeFile])).resolves.toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('parses generate CLI command with route and output options', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-cli-'));
    const routeFile = join(dir, 'routes.json');
    const outDir = join(dir, '.cookbook-router');

    try {
      await writeFile(routeFile, JSON.stringify({ routes: sampleRoutes }));

      await expect(runCli(['generate', '--routes', routeFile, '--out-dir', outDir])).resolves.toBe(
        0,
      );
      await expect(readFile(join(outDir, 'contracts.ts'), 'utf8')).resolves.toContain(
        'RouterContracts',
      );
      await expect(readFile(join(outDir, 'register.d.ts'), 'utf8')).resolves.toContain(
        "declare module '@cookbook/router'",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('parses manifest CLI command with route and output options', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-cli-'));
    const routeFile = join(dir, 'routes.json');
    const outDir = join(dir, '.cookbook-router');

    try {
      await writeFile(routeFile, JSON.stringify({ routes: sampleRoutes }));

      await expect(runCli(['manifest', '--routes', routeFile, '--out-dir', outDir])).resolves.toBe(
        0,
      );
      await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain(
        'users.show',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('can still generate with exported command and custom fs', async () => {
    const fs = createMemoryFileSystem();

    await expect(generateCommand({ routes: sampleRoutes, fs })).resolves.toMatchObject({
      ok: true,
    });
  });
});
