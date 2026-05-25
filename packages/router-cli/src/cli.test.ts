import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runCli, shouldRunCli } from './index';
import { sampleRoutes } from './test-helpers';

describe('CLI executable runner', () => {
  test('prints help for empty arguments', async () => {
    const stdout: string[] = [];

    await expect(runCli([], { stdout: (message) => stdout.push(message) })).resolves.toBe(0);

    expect(stdout.join('\n')).toContain('cookbook-router <command>');
    expect(stdout.join('\n')).toContain('generate');
  });

  test('prints version output', async () => {
    const stdout: string[] = [];

    await expect(
      runCli(['--version'], { stdout: (message) => stdout.push(message), version: '1.2.3' }),
    ).resolves.toBe(0);

    expect(stdout).toEqual(['1.2.3']);
  });

  test('prints unknown command diagnostics', async () => {
    const stderr: string[] = [];

    await expect(
      runCli(['bad-command'], { stderr: (message) => stderr.push(message) }),
    ).resolves.toBe(1);

    expect(stderr.join('\n')).toContain('Unknown command "bad-command"');
  });

  test('prints command errors and returns non-zero exit code', async () => {
    const stderr: string[] = [];

    await expect(runCli(['validate'], { stderr: (message) => stderr.push(message) })).resolves.toBe(
      1,
    );

    expect(stderr.join('\n')).toContain('No routes or routeFiles were provided.');
  });

  test('runs generate as a real CLI command', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-cli-runner-'));
    const routeFile = join(dir, 'routes.json');
    const outDir = join(dir, '.cookbook-router');
    const stdout: string[] = [];

    try {
      await writeFile(routeFile, JSON.stringify({ routes: sampleRoutes }));

      await expect(
        runCli(['generate', '--routes', routeFile, '--out-dir', outDir], {
          stdout: (message) => stdout.push(message),
        }),
      ).resolves.toBe(0);

      await expect(readFile(join(outDir, 'contracts.ts'), 'utf8')).resolves.toContain(
        'RouterContracts',
      );
      await expect(readFile(join(outDir, 'register.d.ts'), 'utf8')).resolves.toContain(
        "declare module '@cookbook/router'",
      );
      await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain(
        'users.show',
      );
      expect(stdout.join('\n')).toContain('Generated 3 files.');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('accepts generate --watch and dispatches to watch validation', async () => {
    const stderr: string[] = [];

    await expect(
      runCli(['generate', '--watch'], { stderr: (message) => stderr.push(message) }),
    ).resolves.toBe(1);

    expect(stderr.join('\n')).toContain(
      'Watch mode requires at least one route file. Pass --routes <file>.',
    );
    expect(stderr.join('\n')).not.toContain('Unknown option "--watch"');
  });

  test('detects when the built file is executed directly', () => {
    expect(
      shouldRunCli('file:///repo/packages/router-cli/dist/index.js', [
        '/usr/bin/node',
        '/repo/packages/router-cli/dist/index.js',
      ]),
    ).toBe(true);
    expect(
      shouldRunCli('file:///repo/packages/router-cli/dist/index.js', [
        '/usr/bin/node',
        '/repo/other.js',
      ]),
    ).toBe(false);
  });
});
