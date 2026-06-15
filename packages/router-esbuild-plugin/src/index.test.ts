import { describe, expect, it } from 'vitest';
import type { OnStartResult, Plugin, PluginBuild } from 'esbuild';
import type { CliFileSystem } from '@cookbook/router-cli';
import { cookbookRouterEsbuildPlugin } from './index';

interface MemoryFileSystem extends CliFileSystem {
  readonly files: Map<string, string>;
}

interface EsbuildTestBuild {
  onStartCallback?: () => Promise<OnStartResult | undefined>;
  onStart(callback: () => Promise<OnStartResult | undefined>): void;
}

function createEsbuildBuild(): EsbuildTestBuild {
  return {
    onStart(callback) {
      this.onStartCallback = callback;
    },
  };
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

describe('cookbookRouterEsbuildPlugin', () => {
  it('generates artifacts from onStart before esbuild compiles modules', async () => {
    const fs = createMemoryFileSystem(createRouteFiles());
    const plugin = cookbookRouterEsbuildPlugin({ fs }) satisfies Plugin;
    const build = createEsbuildBuild();

    plugin.setup(build as unknown as PluginBuild);
    await expect(build.onStartCallback?.()).resolves.toBeUndefined();

    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
  });

  it('uses explicit configFile, routeFiles, outDir, and cwd options', async () => {
    const fs = createMemoryFileSystem({
      'app/router.config.ts': `export default { routeFiles: 'routes/**/*.route.tsx', outDir: '.generated/router' } as const;`,
      'app/routes/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterEsbuildPlugin({
      fs,
      cwd: 'app',
      configFile: 'router.config.ts',
    }) satisfies Plugin;
    const build = createEsbuildBuild();

    plugin.setup(build as unknown as PluginBuild);
    await expect(build.onStartCallback?.()).resolves.toBeUndefined();

    expect(fs.files.get('app/.generated/router/contracts.ts')).toContain('blog');
  });

  it('uses explicit routeFiles and outDir without a config file', async () => {
    const fs = createMemoryFileSystem({
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterEsbuildPlugin({
      fs,
      routeFiles: 'src/**/*.route.tsx',
      outDir: '.generated/router',
    }) satisfies Plugin;
    const build = createEsbuildBuild();

    plugin.setup(build as unknown as PluginBuild);
    await expect(build.onStartCallback?.()).resolves.toBeUndefined();

    expect(fs.files.get('.generated/router/contracts.ts')).toContain('blog');
  });

  it('reports generation failures as esbuild errors', async () => {
    const fs = createMemoryFileSystem({
      ...createRouteFiles(),
      'src/blog-copy.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogCopyRoute = defineRoute({ id: 'blog', path: '/blog-copy' } as const);
`,
    });
    const plugin = cookbookRouterEsbuildPlugin({ fs }) satisfies Plugin;
    const build = createEsbuildBuild();

    plugin.setup(build as unknown as PluginBuild);
    const result = await build.onStartCallback?.();

    expect(result?.errors?.[0]?.text).toContain('[cookbook-router] Duplicate route id "blog".');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toBeUndefined();
  });
});
