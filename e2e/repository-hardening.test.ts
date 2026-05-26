import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = process.cwd();
const packageSourceRoots = [
  'packages/router/src',
  'packages/router-react/src',
  'packages/router-cli/src',
];
const typeOnlyAllowlist = new Set(['packages/router/src/routes/contracts.ts']);

describe('repository hardening', () => {
  test('every implementation file has a colocated test file or explicit type-only allowlist entry', () => {
    const missing: string[] = [];

    for (const sourceRoot of packageSourceRoots) {
      for (const file of walk(join(root, sourceRoot))) {
        const relativePath = file.slice(root.length + 1);

        if (!isSourceFile(relativePath) || isTestFile(relativePath)) {
          continue;
        }

        if (typeOnlyAllowlist.has(relativePath)) {
          continue;
        }

        const withoutExtension = relativePath.replace(/\.tsx?$/, '');
        const hasTest =
          existsSync(join(root, `${withoutExtension}.test.ts`)) ||
          existsSync(join(root, `${withoutExtension}.test.tsx`));

        if (!hasTest) {
          missing.push(relativePath);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  test('test suite does not contain focused or skipped tests', () => {
    const offenders: string[] = [];
    const pattern = /\b(?:describe|test|it)\.(?:only|skip)\s*\(/;

    for (const directory of ['packages', 'examples', 'e2e', 'consumer-trial']) {
      for (const file of walk(join(root, directory))) {
        const relativePath = file.slice(root.length + 1);

        if (!isTestFile(relativePath)) {
          continue;
        }

        if (pattern.test(readFileSync(file, 'utf8'))) {
          offenders.push(relativePath);
        }
      }
    }

    expect(offenders).toEqual([]);
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

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (entry === 'dist' || entry === 'coverage' || entry === 'node_modules') {
        return [];
      }

      return walk(path);
    }

    return stat.isFile() ? [path] : [];
  });
}

function isSourceFile(path: string): boolean {
  const name = basename(path);
  return (path.endsWith('.ts') || path.endsWith('.tsx')) && !name.endsWith('.d.ts');
}

function isTestFile(path: string): boolean {
  return path.endsWith('.test.ts') || path.endsWith('.test.tsx');
}
