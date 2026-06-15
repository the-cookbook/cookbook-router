import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Plugin, PluginContext } from 'rollup';
import type { CliFileSystem } from '@cookbook/router-cli';
import { cookbookRouterRollupPlugin } from './index';

interface MemoryFileSystem extends CliFileSystem {
  readonly files: Map<string, string>;
}

interface RollupTestContext extends PluginContext {
  readonly watchFiles: string[];
  readonly warnings: string[];
}

function createRollupContext(watchMode = false): RollupTestContext {
  const watchFiles: string[] = [];
  const warnings: string[] = [];

  return {
    meta: { rollupVersion: '4.0.0', watchMode },
    watchFiles,
    warnings,
    addWatchFile(path: string) {
      watchFiles.push(path);
    },
    warn(warning: string | Error) {
      warnings.push(warning instanceof Error ? warning.message : String(warning));
    },
    error(error: string | Error): never {
      throw error instanceof Error ? error : new Error(error);
    },
  } as RollupTestContext;
}

async function runBuildStart(plugin: Plugin, context: PluginContext): Promise<void> {
  const hook = plugin.buildStart;

  if (!hook) {
    throw new Error('Expected buildStart hook.');
  }

  if (typeof hook === 'function') {
    await hook.call(context, {} as never);
    return;
  }

  await hook.handler.call(context, {} as never);
}

function createMemoryFileSystem(initialFiles: Record<string, string>): MemoryFileSystem {
  const files = new Map(Object.entries(initialFiles));

  return {
    files,
    async readFile(path) {
      const contents = files.get(path);

      if (contents === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }

      return contents;
    },
    async writeFile(path, contents) {
      files.set(path, contents);
    },
    async mkdir(path) {
      files.set(`${path}/.dir`, '');
    },
    async readdir(path) {
      const prefix = path === '.' ? '' : path.endsWith('/') ? path : `${path}/`;
      const entries = new Set<string>();

      for (const filePath of files.keys()) {
        if (!filePath.startsWith(prefix)) {
          continue;
        }

        const [entry] = filePath.slice(prefix.length).split('/');

        if (entry) {
          entries.add(entry);
        }
      }

      return [...entries].sort();
    },
    async stat(path) {
      if (files.has(path)) {
        return { isFile: () => true, isDirectory: () => false };
      }

      const prefix = path === '.' ? '' : path.endsWith('/') ? path : `${path}/`;

      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          return { isFile: () => false, isDirectory: () => true };
        }
      }

      throw new Error(`ENOENT: ${path}`);
    },
  };
}

function createRouteFiles(): Record<string, string> {
  return {
    'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
    'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
  };
}

describe('cookbookRouterRollupPlugin', () => {
  it('generates artifacts during buildStart and watches config plus route roots', async () => {
    const fs = createMemoryFileSystem(createRouteFiles());
    const plugin = cookbookRouterRollupPlugin({ fs }) satisfies Plugin;
    const context = createRollupContext();

    await runBuildStart(plugin, context);

    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
    expect(context.watchFiles).toEqual([
      resolve('.', 'cookbook-router.config.ts'),
      resolve('.', 'src'),
    ]);
  });

  it('uses explicit routeFiles and outDir options', async () => {
    const fs = createMemoryFileSystem({
      'routes/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterRollupPlugin({
      fs,
      routeFiles: ['routes/**/*.route.tsx'],
      outDir: '.generated/router',
    }) satisfies Plugin;
    const context = createRollupContext();

    await runBuildStart(plugin, context);

    expect(fs.files.get('.generated/router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.generated/router/contracts.ts')).toContain('blog');
  });

  it('uses cwd for config discovery and output paths', async () => {
    const fs = createMemoryFileSystem({
      'app/cookbook-router.config.ts': `export default { routeFiles: 'src/**/*.route.tsx' } as const;`,
      'app/src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterRollupPlugin({ fs, cwd: 'app' }) satisfies Plugin;
    const context = createRollupContext();

    await runBuildStart(plugin, context);

    expect(fs.files.get('app/.cookbook-router/contracts.ts')).toContain('blog');
  });

  it('throws in build mode when generation fails', async () => {
    const fs = createMemoryFileSystem({
      ...createRouteFiles(),
      'src/blog-copy.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogCopyRoute = defineRoute({ id: 'blog', path: '/blog-copy' } as const);
`,
    });
    const plugin = cookbookRouterRollupPlugin({ fs }) satisfies Plugin;
    const context = createRollupContext();

    await expect(runBuildStart(plugin, context)).rejects.toThrow('Duplicate route id "blog".');
    expect(context.warnings[0]).toContain('[cookbook-router] Duplicate route id "blog".');
  });

  it('logs generation failures in watch mode and recovers on the next buildStart', async () => {
    const fs = createMemoryFileSystem({
      ...createRouteFiles(),
      'src/blog-copy.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogCopyRoute = defineRoute({ id: 'blog', path: '/blog-copy' } as const);
`,
    });
    const plugin = cookbookRouterRollupPlugin({ fs }) satisfies Plugin;
    const context = createRollupContext(true);

    await expect(runBuildStart(plugin, context)).resolves.toBeUndefined();
    expect(context.warnings[0]).toContain('Duplicate route id "blog".');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toBeUndefined();

    fs.files.set(
      'src/blog-copy.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const fixedRoute = defineRoute({ id: 'fixed', path: '/fixed' } as const);
`,
    );

    await expect(runBuildStart(plugin, context)).resolves.toBeUndefined();
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('fixed');
  });
});
