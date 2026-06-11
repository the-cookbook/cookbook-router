import { describe, expect, it } from 'vitest';
import { runCli, shouldRunCli } from './run-cli';

describe('runCli', () => {
  it('prints help when no command is provided', async () => {
    const stdout: string[] = [];

    await expect(runCli([], { stdout: (message) => stdout.push(message) })).resolves.toBe(0);
    expect(stdout[0]).toContain('cookbook-router <command>');
  });

  it('prints version when requested', async () => {
    const stdout: string[] = [];

    await expect(
      runCli(['--version'], { version: '1.2.3', stdout: (message) => stdout.push(message) }),
    ).resolves.toBe(0);
    expect(stdout).toEqual(['1.2.3']);
  });
});

describe('shouldRunCli', () => {
  it('compares the module URL to the process entrypoint', () => {
    expect(shouldRunCli('file:///tmp/cbr.js', ['node', '/tmp/cbr.js'])).toBe(true);
    expect(shouldRunCli('file:///tmp/cbr.js', ['node', '/tmp/other.js'])).toBe(false);
  });
});
