import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const trialRoot = join(root, 'consumer-trial');

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('external consumer trial app', () => {
  it('is outside workspace packages and examples', () => {
    const workspace = read('pnpm-workspace.yaml');

    expect(existsSync(trialRoot)).toBe(true);
    expect(workspace).toContain('packages/*');
    expect(workspace).toContain('examples/*');
    expect(workspace).not.toContain('consumer-trial');
  });

  it('uses installable package entries instead of workspace protocol', () => {
    const packageJson = JSON.parse(read('consumer-trial/package.json')) as {
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(packageJson.dependencies['@cookbook/router']).toBe('file:../packages/router');
    expect(packageJson.dependencies['@cookbook/router-react']).toBe(
      'file:../packages/router-react',
    );
    expect(packageJson.dependencies['@cookbook/router-cli']).toBe('file:../packages/router-cli');
    expect(
      Object.values(packageJson.dependencies).some((value) => value.startsWith('workspace:')),
    ).toBe(false);
    expect(packageJson.scripts.build).toContain('pnpm generate');
    expect(packageJson.scripts.build).toContain('vite build');
  });

  it('does not use deep imports from router packages', () => {
    const sourceFiles = [
      'src/app.tsx',
      'src/pages.tsx',
      'src/router.ts',
      'src/routes.tsx',
      'src/entry-server.tsx',
      'src/main.tsx',
    ];

    for (const sourceFile of sourceFiles) {
      const source = read(`consumer-trial/${sourceFile}`);
      expect(source).not.toMatch(/@cookbook\/router(?:-react)?\//);
    }
  });

  it('validates generated contracts and typed route coverage', () => {
    const contracts = read('consumer-trial/.cookbook-router/contracts.ts');
    const register = read('consumer-trial/.cookbook-router/register.d.ts');
    const typeTests = read('consumer-trial/src/contracts.test.ts');

    expect(register).toContain("declare module '@cookbook/router'");
    expect(contracts).toContain("'users.show': { id: number };");
    expect(contracts).toContain("'blog.posts.show': { slug: string };");
    expect(typeTests).toContain("RouteParams<'users.show'>");
    expect(typeTests).toContain("RouteSearch<'users.show'>");
    expect(typeTests).toContain("RouteHashInput<'users.show'>");
  });

  it('covers React setup, SSR setup, build, and package exports', () => {
    expect(read('consumer-trial/src/main.tsx')).toContain('createRoot');
    expect(read('consumer-trial/src/main.tsx')).toContain('hydrateRoot');
    expect(read('consumer-trial/src/entry-server.tsx')).toContain('renderToString');
    expect(read('consumer-trial/src/entry-server.tsx')).toContain('serializeRouterState');
    expect(read('consumer-trial/src/entry-server.tsx')).toContain('stringifyRouterState');
    expect(read('consumer-trial/src/package-exports.test.ts')).toContain("from '@cookbook/router'");
    expect(read('consumer-trial/src/package-exports.test.ts')).toContain(
      "from '@cookbook/router-react'",
    );
  });

  it('has a CI-compatible fresh install validation script', () => {
    const rootPackage = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const script = read('scripts/run-consumer-trial.mjs');
    const ci = read('.github/workflows/ci.yml');

    expect(rootPackage.scripts['test:consumer-trial']).toBe(
      'node ./scripts/run-consumer-trial.mjs',
    );
    expect(script).toContain('pnpm build:packages');
    expect(script).toContain('pnpm pack');
    expect(script).toContain('packageJson.pnpm.overrides');
    expect(read('consumer-trial/scripts/validate-no-deep-imports.mjs')).toContain(
      "fileURLToPath(new URL('../src/', import.meta.url))",
    );
    expect(read('consumer-trial/vite.config.ts')).toContain("from 'vitest/config'");
    expect(read('consumer-trial/vite.config.ts')).not.toContain("from 'vite'");
    expect(read('consumer-trial/package.json')).toContain('vitest run --environment jsdom');
    expect(script).toContain('pnpm install');
    expect(script).toContain('pnpm validate:trial');
    expect(ci).toContain('pnpm test:consumer-trial');
  });
});
