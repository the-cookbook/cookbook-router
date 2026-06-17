import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  readonly bin: Record<string, string>;
};

describe('CLI binary entrypoint', () => {
  it('publishes binaries from the dedicated bin entrypoint', () => {
    expect(packageJson.bin).toEqual({
      cbr: './dist/bin.js',
      'cookbook-router': './dist/bin.js',
    });
  });

  it('keeps the package library entrypoint side-effect free', () => {
    const indexSource = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf8');
    const binSource = readFileSync(join(process.cwd(), 'src/bin.ts'), 'utf8');

    expect(indexSource).not.toContain('process.argv.slice(2)');
    expect(indexSource).not.toContain('process.exitCode');
    expect(binSource).toContain('runCli(process.argv.slice(2))');
    expect(binSource.startsWith('#!/usr/bin/env node')).toBe(true);
  });
});
