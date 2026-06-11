import { describe, expect, it } from 'vitest';
import { HELP_TEXT } from './help-text';

describe('HELP_TEXT', () => {
  it('documents the supported commands and common options', () => {
    expect(HELP_TEXT).toContain('generate');
    expect(HELP_TEXT).toContain('manifest');
    expect(HELP_TEXT).toContain('validate');
    expect(HELP_TEXT).toContain('--routes <file>');
    expect(HELP_TEXT).toContain('--out-dir <dir>');
  });
});
