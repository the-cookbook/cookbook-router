import { describe, expect, it } from 'vitest';
import { formatCommandError } from './format-command-error';

describe('formatCommandError', () => {
  it('formats non-verbose errors as user-facing messages', () => {
    expect(formatCommandError(new Error('invalid route'), false)).toBe('invalid route');
    expect(formatCommandError('plain failure', false)).toBe('plain failure');
  });

  it('includes stack and nested causes in verbose mode', () => {
    const cause = new Error('inner failure');
    const error = new Error('outer failure', { cause });

    const formatted = formatCommandError(error, true);

    expect(formatted).toContain('outer failure');
    expect(formatted).toContain('Caused by:');
    expect(formatted).toContain('inner failure');
  });

  it('formats non-error causes in verbose mode', () => {
    const error = new Error('outer failure', { cause: 'string cause' });

    expect(formatCommandError(error, true)).toContain('Caused by: string cause');
  });
});
