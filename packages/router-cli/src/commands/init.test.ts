import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem } from '../test-helpers';
import { initCommand } from './init';

describe('initCommand', () => {
  it('bootstraps config, starter route, package scripts, and generated artifacts', async () => {
    const fs = createMemoryFileSystem({
      'package.json': JSON.stringify({ name: 'app', scripts: { test: 'vitest' } }),
    });

    const result = await initCommand({ fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('cookbook-router.config.ts')).toContain('defineRouterConfig');
    expect(fs.files.get('src/root.route.tsx')).toContain('defineRoute');
    expect(fs.files.get('package.json')).toContain('routes:generate');
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('rootRoute');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('root');
  });

  it('detects app source roots instead of creating src in app-directory projects', async () => {
    const fs = createMemoryFileSystem({
      'package.json': JSON.stringify({ name: 'app', scripts: { dev: 'vite' } }),
      'app/app.tsx': 'export function App() { return null; }',
    });

    const result = await initCommand({ fs, skipGenerate: true });

    expect(result.ok).toBe(true);
    expect(fs.files.get('cookbook-router.config.ts')).toContain(
      '"app/**/*.route.{ts,tsx,js,jsx,mts,cts,mjs,cjs}"',
    );
    expect(fs.files.get('app/root.route.tsx')).toContain('defineRoute');
    expect(fs.files.has('src/root.route.tsx')).toBe(false);
  });

  it('updates tsconfig include with detected source root and generated output directory', async () => {
    const fs = createMemoryFileSystem({
      'package.json': JSON.stringify({ name: 'app', scripts: { dev: 'vite' } }),
      'app/app.tsx': 'export function App() { return null; }',
      'tsconfig.json': JSON.stringify({ compilerOptions: {}, include: ['app'] }),
    });

    const result = await initCommand({ fs, skipGenerate: true });

    expect(result.ok).toBe(true);
    expect(JSON.parse(fs.files.get('tsconfig.json') ?? '{}')).toMatchObject({
      include: ['app', '.cookbook-router'],
    });
  });

  it('accepts custom config file, route file globs, and output directory', async () => {
    const fs = createMemoryFileSystem({
      'package.json': JSON.stringify({ name: 'app', scripts: {} }),
      'tsconfig.json': JSON.stringify({ compilerOptions: {}, include: [] }),
    });

    const result = await initCommand({
      fs,
      configFile: 'router.config.ts',
      routeFiles: ['app/**/*.route.tsx', 'features/**/*.route.ts'],
      outDir: '.generated/router',
      skipGenerate: true,
    });

    expect(result.ok).toBe(true);
    expect(fs.files.get('router.config.ts')).toContain(
      '"app/**/*.route.tsx","features/**/*.route.ts"',
    );
    expect(fs.files.get('router.config.ts')).toContain('".generated/router"');
    expect(fs.files.get('package.json')).toContain('cbr generate --config router.config.ts');
    expect(JSON.parse(fs.files.get('tsconfig.json') ?? '{}')).toMatchObject({
      include: ['app', 'features', '.generated/router'],
    });
  });

  it('does not create an unmatched starter route when custom route globs are provided', async () => {
    const fs = createMemoryFileSystem({
      'package.json': JSON.stringify({ name: 'app', scripts: {} }),
    });

    const result = await initCommand({
      fs,
      routeFiles: ['features/**/*.route.ts'],
    });

    expect(result.ok).toBe(true);
    expect(fs.files.get('cookbook-router.config.ts')).toContain('features/**/*.route.ts');
    expect(fs.files.has('src/root.route.tsx')).toBe(false);
    expect(fs.files.has('features/root.route.tsx')).toBe(false);
  });

  it('creates an explicit starter route even when custom route globs are provided', async () => {
    const fs = createMemoryFileSystem({
      'package.json': JSON.stringify({ name: 'app', scripts: {} }),
    });

    const result = await initCommand({
      fs,
      routeFiles: ['features/**/*.route.ts'],
      starterRouteFile: 'features/root.route.tsx',
      skipGenerate: true,
    });

    expect(result.ok).toBe(true);
    expect(fs.files.get('features/root.route.tsx')).toContain('defineRoute');
  });

  it('does not overwrite an existing config', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': 'export default {};',
    });

    const result = await initCommand({ fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Refusing to overwrite');
  });
});
