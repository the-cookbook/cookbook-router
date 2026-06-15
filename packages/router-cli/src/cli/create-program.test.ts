import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCliProgram } from './create-program';

const sampleRoutesJson = JSON.stringify({
  routes: [
    {
      id: 'root',
      path: '/',
      children: [{ id: 'home', index: true }],
    },
  ],
});

describe('createCliProgram', () => {
  it('creates a Commander program with version output routed through injected IO', async () => {
    const stdout: string[] = [];
    const program = createCliProgram({
      version: '1.2.3',
      stdout: (message) => stdout.push(message),
      stderr: () => undefined,
    });

    await expect(
      program.parseAsync(['node', 'cookbook-router', '--version']),
    ).rejects.toMatchObject({
      exitCode: 0,
    });
    expect(stdout).toEqual(['1.2.3']);
  });

  it('parses generate options and writes artifacts to the requested output directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-create-program-'));
    const routeFile = join(dir, 'routes.json');
    const outDir = join(dir, '.router');
    const stdout: string[] = [];
    const stderr: string[] = [];
    let exitCode = 0;

    try {
      await writeFile(routeFile, sampleRoutesJson);

      const program = createCliProgram({
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
        setExitCode: (code) => {
          exitCode = code;
        },
      });

      await program.parseAsync([
        'node',
        'cookbook-router',
        'generate',
        '--routes',
        routeFile,
        '--out-dir',
        outDir,
      ]);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout.join('\n')).toContain('Generated');
      await expect(readFile(join(outDir, 'contracts.ts'), 'utf8')).resolves.toContain('home');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reports command failures, JSON output, and non-zero exit code without throwing', async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let exitCode = 0;
    const program = createCliProgram({
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
      setExitCode: (code) => {
        exitCode = code;
      },
    });

    await program.parseAsync(['node', 'cookbook-router', 'validate', '--json']);

    expect(exitCode).toBe(1);
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout[0] ?? '{}')).toMatchObject({
      ok: false,
      errors: ['No routes or routeFiles were provided.'],
    });
  });
});
