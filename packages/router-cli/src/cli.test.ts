import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runCli, shouldRunCli } from './index';
import { sampleRoutes } from './test-helpers';

describe('CLI executable runner', () => {
  it('prints help for empty arguments', async () => {
    const stdout: string[] = [];

    await expect(runCli([], { stdout: (message) => stdout.push(message) })).resolves.toBe(0);

    expect(stdout.join('\n')).toContain('cookbook-router <command>');
    expect(stdout.join('\n')).toContain('generate');
  });

  it('prints version output', async () => {
    const stdout: string[] = [];

    await expect(
      runCli(['--version'], { stdout: (message) => stdout.push(message), version: '1.2.3' }),
    ).resolves.toBe(0);

    expect(stdout).toEqual(['1.2.3']);
  });

  it('prints unknown command diagnostics', async () => {
    const stderr: string[] = [];

    await expect(
      runCli(['bad-command'], { stderr: (message) => stderr.push(message) }),
    ).resolves.toBe(1);

    expect(stderr.join('\n')).toContain("unknown command 'bad-command'");
  });

  it('prints command errors and returns non-zero exit code', async () => {
    const stderr: string[] = [];

    await expect(runCli(['validate'], { stderr: (message) => stderr.push(message) })).resolves.toBe(
      1,
    );

    expect(stderr.join('\n')).toContain('No routes or routeFiles were provided.');
  });

  it('runs generate as a real CLI command', async () => {
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

  it('prints JSON command results', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-cli-json-'));
    const routeFile = join(dir, 'routes.json');
    const stdout: string[] = [];

    try {
      await writeFile(routeFile, JSON.stringify({ routes: sampleRoutes }));

      await expect(
        runCli(['validate', '--routes', routeFile, '--json'], {
          stdout: (message) => stdout.push(message),
        }),
      ).resolves.toBe(0);

      expect(JSON.parse(stdout.join('\n'))).toEqual({ ok: true, files: [], errors: [] });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('resolves config and route globs from --cwd', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-cli-cwd-'));
    const appDir = join(dir, 'app');
    const stdout: string[] = [];

    try {
      await import('node:fs/promises').then(({ mkdir }) => mkdir(appDir, { recursive: true }));
      await writeFile(
        join(dir, 'cookbook-router.config.ts'),
        `import { defineRouterConfig } from '@cookbook/router-cli';
export default defineRouterConfig({ routeFiles: 'app/**/*.route.tsx' } as const);
`,
      );
      await writeFile(
        join(appDir, 'home.route.tsx'),
        `import { defineRoute } from '@cookbook/router';
export const homeRoute = defineRoute({ id: 'home', path: '/' } as const);
`,
      );

      await expect(
        runCli(['generate', '--cwd', dir], { stdout: (message) => stdout.push(message) }),
      ).resolves.toBe(0);

      await expect(
        readFile(join(dir, '.cookbook-router/manifest.json'), 'utf8'),
      ).resolves.toContain('home');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('accepts generate --watch and dispatches to watch validation', async () => {
    const stderr: string[] = [];

    await expect(
      runCli(['generate', '--watch'], { stderr: (message) => stderr.push(message) }),
    ).resolves.toBe(1);

    expect(stderr.join('\n')).toContain(
      'Watch mode requires at least one route file. Pass --routes <file>.',
    );
    expect(stderr.join('\n')).not.toContain('Unknown option "--watch"');
  });

  it('detects when the built file is executed directly', () => {
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
