import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig, ViteDevServer } from 'vite';
import type { CliFileSystem } from '@cookbook/router-cli';
import { cookbookRouterVitePlugin } from './index';

interface MemoryFileSystem extends CliFileSystem {
  readonly files: Map<string, string>;
}

interface FakeWatcher {
  readonly added: string[];
  readonly unwatched: string[];
  readonly listeners: ((event: string, path: string) => void)[];
  add: (paths: string | readonly string[]) => void;
  unwatch: (path: string) => void;
  on: (event: 'all', listener: (event: string, path: string) => void) => FakeWatcher;
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

function createFakeWatcher(): FakeWatcher {
  return {
    added: [],
    unwatched: [],
    listeners: [],
    add(paths) {
      this.added.push(...(typeof paths === 'string' ? [paths] : paths));
    },
    unwatch(path) {
      this.unwatched.push(path);
    },
    on(_event, listener) {
      this.listeners.push(listener);
      return this;
    },
  };
}

function nextTick(): Promise<void> {
  return new Promise((resolveTick) => setTimeout(resolveTick, 0));
}

const pluginContext = {
  meta: {
    rollupVersion: '4.0.0',
    watchMode: false,
  },
  debug() {},
  info() {},
  warn() {},
  error(error: unknown): never {
    throw error instanceof Error ? error : new Error(String(error));
  },
} as never;

describe('cookbookRouterVitePlugin', () => {
  it('generates artifacts during buildStart', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs });
    const configResolved = plugin.configResolved;
    const buildStart = plugin.buildStart;

    if (typeof configResolved !== 'function' || typeof buildStart !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    configResolved.call(pluginContext, { root: '.' } as ResolvedConfig);
    await buildStart.call(pluginContext, undefined as never);

    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
  });

  it('generates artifacts during dev server setup before application modules are transformed', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'app/**/*.route.{ts,tsx}',
} as const);
`,
      'app/pages/overview/overview.route.tsx': `import { defineRoute } from '@cookbook/router';
export const overviewRoute = defineRoute({ id: 'overview', path: '/overview' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    configResolved.call(pluginContext, { root: '.' } as ResolvedConfig);

    const watcher = createFakeWatcher();
    const reloads: unknown[] = [];
    const server = {
      watcher,
      ws: {
        send(message: unknown) {
          reloads.push(message);
        },
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);

    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('overview');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('overview');
    expect(reloads).toEqual([]);
  });

  it('regenerates generated artifacts when files inside the output directory are deleted', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    configResolved.call(pluginContext, { root: '.' } as ResolvedConfig);

    const watcher = createFakeWatcher();
    const reloads: unknown[] = [];
    const server = {
      watcher,
      ws: {
        send(message: unknown) {
          reloads.push(message);
        },
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('blog');

    fs.files.delete('.cookbook-router/routes.ts');
    watcher.listeners[0]?.('unlink', resolve('.', '.cookbook-router/routes.ts'));
    await nextTick();
    await nextTick();

    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('blog');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
    expect(reloads).toEqual([{ type: 'full-reload' }]);
  });

  it('reports unresolved relative imports from the router config', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './missing-constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
  pathConstraints,
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    const errors: string[] = [];
    configResolved.call(pluginContext, {
      root: '.',
      logger: {
        error(message: string) {
          errors.push(message);
        },
      },
    } as unknown as ResolvedConfig);

    const watcher = createFakeWatcher();
    const server = {
      watcher,
      ws: {
        send() {},
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);

    expect(errors.join('\n')).toContain(
      'Router config "cookbook-router.config.ts" imports pathConstraints from "./missing-constraints", but the module could not be resolved.',
    );
  });

  it('watches config and glob roots, ignores generated files, and reloads after regeneration', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    configResolved.call(pluginContext, { root: '.' } as ResolvedConfig);

    const watcher = createFakeWatcher();
    const reloads: unknown[] = [];
    const server = {
      watcher,
      ws: {
        send(message: unknown) {
          reloads.push(message);
        },
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);

    expect(watcher.added).toEqual([
      resolve('.', 'cookbook-router.config.ts'),
      resolve('.', 'src'),
      resolve('.', '.cookbook-router'),
    ]);
    expect(watcher.unwatched).toEqual([]);

    watcher.listeners[0]?.('change', resolve('.', '.cookbook-router/contracts.ts'));
    await nextTick();
    await nextTick();
    expect(reloads).toEqual([]);

    fs.files.set(
      'src/article.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const articleRoute = defineRoute({
  id: 'blog.article',
  parent: 'blog',
  path: 'articles/{slug}',
} as const);
`,
    );
    watcher.listeners[0]?.('add', resolve('.', 'src/article.route.tsx'));
    await nextTick();
    await nextTick();

    expect(reloads).toEqual([{ type: 'full-reload' }]);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.article': { slug: string };",
    );
  });

  it('does not double-prefix already scoped config and route watch paths for relative roots', async () => {
    const fs = createMemoryFileSystem({
      'app/cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'app/src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    configResolved.call(pluginContext, { root: 'app' } as ResolvedConfig);

    const watcher = createFakeWatcher();
    const reloads: unknown[] = [];
    const server = {
      watcher,
      ws: {
        send(message: unknown) {
          reloads.push(message);
        },
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);

    expect(watcher.added).toEqual([
      resolve('app', 'cookbook-router.config.ts'),
      resolve('app', 'src'),
      resolve('app', '.cookbook-router'),
    ]);
    expect(watcher.unwatched).toEqual([]);

    fs.files.set(
      'app/src/article.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const articleRoute = defineRoute({ id: 'article', path: '/article' } as const);
`,
    );
    watcher.listeners[0]?.('add', resolve('app', 'src/article.route.tsx'));
    await nextTick();
    await nextTick();

    expect(reloads).toEqual([{ type: 'full-reload' }]);
    expect(fs.files.get('app/.cookbook-router/contracts.ts')).toContain('article');
  });

  it('tracks added, modified, and deleted route files and recovers after errors', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
export const articleRoute = defineRoute({ id: 'article', path: '/article' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    const errors: string[] = [];
    configResolved.call(pluginContext, {
      root: '.',
      logger: {
        error(message: string) {
          errors.push(message);
        },
      },
    } as unknown as ResolvedConfig);

    const watcher = createFakeWatcher();
    const reloads: unknown[] = [];
    const server = {
      watcher,
      ws: {
        send(message: unknown) {
          reloads.push(message);
        },
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);

    fs.files.set(
      'src/report.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const reportRoute = defineRoute({ id: 'report', path: '/report' } as const);
`,
    );
    watcher.listeners[0]?.('add', resolve('.', 'src/report.route.tsx'));
    await nextTick();
    await nextTick();
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('report');

    fs.files.set(
      'src/report.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const reportRoute = defineRoute({ id: 'blog', path: '/report' } as const);
`,
    );
    watcher.listeners[0]?.('change', resolve('.', 'src/report.route.tsx'));
    await nextTick();
    await nextTick();
    expect(errors[errors.length - 1]).toContain('Duplicate route id "blog".');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('report');

    fs.files.set(
      'src/report.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const reportRoute = defineRoute({ id: 'report.fixed', path: '/report-fixed' } as const);
`,
    );
    watcher.listeners[0]?.('change', resolve('.', 'src/report.route.tsx'));
    await nextTick();
    await nextTick();
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('report.fixed');

    fs.files.delete('src/report.route.tsx');
    watcher.listeners[0]?.('unlink', resolve('.', 'src/report.route.tsx'));
    await nextTick();
    await nextTick();
    expect(fs.files.get('.cookbook-router/contracts.ts')).not.toContain('report.fixed');
    expect(reloads).toHaveLength(3);
  });

  it('refreshes watched roots when the config routeFiles root changes', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
      'features/account.route.tsx': `import { defineRoute } from '@cookbook/router';
export const accountRoute = defineRoute({ id: 'account', path: '/account' } as const);
`,
    });
    const plugin = cookbookRouterVitePlugin({ fs, debounceMs: 0 });
    const configResolved = plugin.configResolved;
    const configureServer = plugin.configureServer;

    if (typeof configResolved !== 'function' || typeof configureServer !== 'function') {
      throw new Error('Expected cookbookRouterVitePlugin hooks to be functions.');
    }

    configResolved.call(pluginContext, { root: '.' } as ResolvedConfig);

    const watcher = createFakeWatcher();
    const server = {
      watcher,
      ws: {
        send() {},
      },
    } as unknown as ViteDevServer;

    await configureServer.call(pluginContext, server);
    expect(watcher.added).toContain(resolve('.', 'src'));

    fs.files.set(
      'cookbook-router.config.ts',
      `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'features/**/*.route.{ts,tsx}',
} as const);
`,
    );
    watcher.listeners[0]?.('change', resolve('.', 'cookbook-router.config.ts'));
    await nextTick();
    await nextTick();

    expect(watcher.added).toContain(resolve('.', 'features'));
    expect(watcher.unwatched).toContain(resolve('.', 'src'));
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('account');
  });
});
