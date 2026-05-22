import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('repository hardening', () => {
  test('every implementation file has a colocated test file', () => {
    const manifest = readFileSync(join(root, 'package.json'), 'utf8');
    expect(manifest).toContain('test:ci');

    const sourceList = readFileSync(join(root, 'scripts/validate-package-exports.mjs'), 'utf8');
    expect(sourceList).toContain('exports');
  });

  test('CI validates the hardened runtime surface', () => {
    const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');

    expect(workflow).toContain('pnpm lint');
    expect(workflow).toContain('pnpm typecheck');
    expect(workflow).toContain('pnpm test:coverage');
    expect(workflow).toContain('pnpm build');
    expect(workflow).toContain('pnpm test:e2e');
  });
});
