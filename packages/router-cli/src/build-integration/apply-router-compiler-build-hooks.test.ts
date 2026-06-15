import { describe, expect, it, vi } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { resolveBuildPath } from './create-router-build-runner';
import { applyRouterCompilerBuildHooks } from './apply-router-compiler-build-hooks';

class AsyncHook<Args extends readonly unknown[]> {
  handler: ((...args: Args) => Promise<void>) | undefined;

  tapPromise(_name: string, handler: (...args: Args) => Promise<void>): void {
    this.handler = handler;
  }

  async call(...args: Args): Promise<void> {
    await this.handler?.(...args);
  }
}

interface FakeCompilation {
  readonly fileDependencies: Set<string>;
  readonly contextDependencies: Set<string>;
  readonly missingDependencies: Set<string>;
}

interface FakeCompiler {
  readonly context?: string;
  readonly options: {
    context?: string;
    watchOptions?: {
      ignored?: string | RegExp | readonly (string | RegExp)[] | ((path: string) => boolean);
    };
  };
  readonly hooks: {
    readonly beforeRun: AsyncHook<[FakeCompiler]>;
    readonly watchRun: AsyncHook<[FakeCompiler]>;
    readonly afterCompile: AsyncHook<[FakeCompilation]>;
  };
  getInfrastructureLogger(name: string): { readonly error: (message: string) => void };
}

function createCompiler(): { readonly compiler: FakeCompiler; readonly errors: string[] } {
  const errors: string[] = [];
  const compiler: FakeCompiler = {
    context: '.',
    options: { context: '.' },
    hooks: {
      beforeRun: new AsyncHook<[FakeCompiler]>(),
      watchRun: new AsyncHook<[FakeCompiler]>(),
      afterCompile: new AsyncHook<[FakeCompilation]>(),
    },
    getInfrastructureLogger: () => ({ error: (message) => errors.push(message) }),
  };

  return { compiler, errors };
}

function createCompilation(): FakeCompilation {
  return {
    fileDependencies: new Set(),
    contextDependencies: new Set(),
    missingDependencies: new Set(),
  };
}

describe('applyRouterCompilerBuildHooks', () => {
  it('generates before compilation and adds route/config dependencies', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `export default { routeFiles: 'routes.json' } as const;`,
      'routes.json': JSON.stringify({ routes: sampleRoutes }),
    });
    const { compiler } = createCompiler();
    const compilation = createCompilation();

    applyRouterCompilerBuildHooks(compiler, { fs });
    await compiler.hooks.beforeRun.call(compiler);
    await compiler.hooks.afterCompile.call(compilation);

    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('users.show');
    expect([...compilation.fileDependencies].some((path) => path.endsWith('routes.json'))).toBe(
      true,
    );
    expect(
      [...compilation.missingDependencies].some((path) =>
        path.endsWith('cookbook-router.config.ts'),
      ),
    ).toBe(true);
    expect(compiler.options.watchOptions?.ignored).toEqual([
      resolveBuildPath('.', '.cookbook-router'),
    ]);
  });

  it('throws during build mode failures and logs through infrastructure logger', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    });
    const { compiler, errors } = createCompiler();

    applyRouterCompilerBuildHooks(compiler, { fs, routeFiles: ['routes.json'] });

    await expect(compiler.hooks.beforeRun.call(compiler)).rejects.toThrow('index');
    expect(errors[0]).toContain('[cookbook-router]');
  });

  it('does not throw during watch failures so the next run can recover', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    });
    const { compiler, errors } = createCompiler();

    applyRouterCompilerBuildHooks(compiler, { fs, routeFiles: ['routes.json'] });

    await expect(compiler.hooks.watchRun.call(compiler)).resolves.toBeUndefined();
    expect(errors[0]).toContain('[cookbook-router]');
  });

  it('extends existing ignored watch options without duplicating the generated directory', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: sampleRoutes }),
    });
    const { compiler } = createCompiler();
    compiler.options.watchOptions = { ignored: ['node_modules'] };

    applyRouterCompilerBuildHooks(compiler, { fs, routeFiles: ['routes.json'] });
    await compiler.hooks.afterCompile.call(createCompilation());
    await compiler.hooks.afterCompile.call(createCompilation());

    expect(compiler.options.watchOptions.ignored).toEqual([
      'node_modules',
      resolveBuildPath('.', '.cookbook-router'),
    ]);
  });

  it('wraps function ignored watch options to include the generated directory', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: sampleRoutes }),
    });
    const { compiler } = createCompiler();
    const ignored = vi.fn((path: string) => path.includes('node_modules'));
    compiler.options.watchOptions = { ignored };

    applyRouterCompilerBuildHooks(compiler, { fs, routeFiles: ['routes.json'] });
    await compiler.hooks.afterCompile.call(createCompilation());

    const nextIgnored = compiler.options.watchOptions.ignored;
    expect(typeof nextIgnored).toBe('function');
    expect(
      typeof nextIgnored === 'function' ? nextIgnored('.cookbook-router/routes.ts') : false,
    ).toBe(true);
    expect(
      typeof nextIgnored === 'function' ? nextIgnored('node_modules/pkg/index.js') : false,
    ).toBe(true);
  });
});
