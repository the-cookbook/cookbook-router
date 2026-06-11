import { describe, expect, it } from 'vitest';
import { reportCommandResult } from './report-command-result';

describe('reportCommandResult', () => {
  it('reports generated files', () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    expect(
      reportCommandResult(
        { ok: true, files: ['contracts.ts', 'register.d.ts'], errors: [] },
        (message) => stdout.push(message),
        (message) => stderr.push(message),
      ),
    ).toBe(0);
    expect(stdout).toEqual(['Generated 2 files.', '  contracts.ts', '  register.d.ts']);
    expect(stderr).toEqual([]);
  });

  it('reports validation errors', () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    expect(
      reportCommandResult(
        { ok: false, files: [], errors: ['Invalid route'] },
        (message) => stdout.push(message),
        (message) => stderr.push(message),
      ),
    ).toBe(1);
    expect(stdout).toEqual([]);
    expect(stderr).toEqual(['Invalid route']);
  });
});
