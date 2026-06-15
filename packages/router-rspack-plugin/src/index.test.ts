import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import type { CliFileSystem } from '@cookbook/router-cli';
import { CookbookRouterRspackPlugin } from './index';

interface MemoryFileSystem extends CliFileSystem {
  readonly files: Map<string, string>;
}

interface FakeCompiler {
  readonly context: string;
  readonly options: {
    context: string;
    watchOptions: {
      ignored?: string | RegExp | readonly (string | RegExp)[] | ((path: string) => boolean);
    };
  };
  readonly hooks: {
    readonly beforeRun: FakeAsyncHook<[FakeCompiler]>;
    readonly watchRun: FakeAsyncHook<[FakeCompiler]>;
    readonly afterCompile: FakeAsyncHook<[FakeCompilation]>;
  };
  getInfrastructureLogger(name: string): { error: (message: string) => void };
  readonly errors: string[];
}

interface FakeCompilation {
  readonly fileDependencies: Set<string>;
  readonly contextDependencies: Set<string>;
  readonly missingDependencies: Set<string>;
}

class FakeAsyncHook<Args extends readonly unknown[]> {
  handler: ((...args: Args) => Promise<void>) | undefined;

  tapPromise(_name: string, handler: (...args: Args) => Promise<void>): void {
    this.handler = handler;
  }

  async promise(...args: Args): Promise<void> {
    if (!this.handler) {
      throw new Error('Expected hook handler to be registered.');
    }

    await this.handler(...args);
  }
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

function createCompiler(context = '.'): FakeCompiler {
  const errors: string[] = [];

  return {
    context,
    options: {
      context,
      watchOptions: {},
    },
    hooks: {
      beforeRun: new FakeAsyncHook<[FakeCompiler]>(),
      watchRun: new FakeAsyncHook<[FakeCompiler]>(),
      afterCompile: new FakeAsyncHook<[FakeCompilation]>(),
    },
    getInfrastructureLogger() {
      return {
        error(message: string) {
          errors.push(message);
        },
      };
    },
    errors,
  };
}

function createCompilation(): FakeCompilation {
  return {
    fileDependencies: new Set<string>(),
    contextDependencies: new Set<string>(),
    missingDependencies: new Set<string>(),
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

describe('CookbookRouterRspackPlugin', () => {
  it('generates artifacts through Rspack-compatible compiler hooks', async () => {
    const fs = createMemoryFileSystem(createRouteFiles());
    const compiler = createCompiler();

    const plugin = new CookbookRouterRspackPlugin({ fs }) satisfies RspackPluginInstance;
    plugin.apply(compiler as unknown as Compiler);
    await compiler.hooks.beforeRun.promise(compiler);

    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
  });

  it('adds config and route glob roots as Rspack watch dependencies', async () => {
    const fs = createMemoryFileSystem(createRouteFiles());
    const compiler = createCompiler();
    const compilation = createCompilation();

    const plugin = new CookbookRouterRspackPlugin({ fs }) satisfies RspackPluginInstance;
    plugin.apply(compiler as unknown as Compiler);
    await compiler.hooks.beforeRun.promise(compiler);
    await compiler.hooks.afterCompile.promise(compilation);

    expect(compilation.fileDependencies).toEqual(
      new Set([resolve('.', 'cookbook-router.config.ts')]),
    );
    expect(compilation.contextDependencies).toEqual(new Set([resolve('.', 'src')]));
    expect(compiler.options.watchOptions.ignored).toEqual([resolve('.', '.cookbook-router')]);
  });

  it('does not throw in watch mode when generation fails and recovers on the next run', async () => {
    const fs = createMemoryFileSystem({
      ...createRouteFiles(),
      'src/blog-copy.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogCopyRoute = defineRoute({ id: 'blog', path: '/blog-copy' } as const);
`,
    });
    const compiler = createCompiler();

    const plugin = new CookbookRouterRspackPlugin({ fs }) satisfies RspackPluginInstance;
    plugin.apply(compiler as unknown as Compiler);

    await expect(compiler.hooks.watchRun.promise(compiler)).resolves.toBeUndefined();
    expect(compiler.errors[0]).toContain('Duplicate route id "blog".');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toBeUndefined();

    fs.files.set(
      'src/blog-copy.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const fixedRoute = defineRoute({ id: 'fixed', path: '/fixed' } as const);
`,
    );

    await expect(compiler.hooks.watchRun.promise(compiler)).resolves.toBeUndefined();
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('fixed');
  });
});
