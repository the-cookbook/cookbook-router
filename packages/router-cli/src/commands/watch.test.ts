import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { watchCommand } from './watch';

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('watchCommand', () => {
  it('generates initially and registers route file watchers', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });

    await expect(handle.initial).resolves.toMatchObject({ ok: true });

    expect(results).toEqual([true]);
    expect(fs.watchers.get('routes.json')).toHaveLength(1);
    handle.close();
    expect(fs.watchers.get('routes.json')).toEqual([]);
  });

  it('regenerates generated artifacts after route file changes', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'about', path: '/about' }] }));
    fs.emit('routes.json');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, true]);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('about');
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('about');
    expect(fs.files.get('.cookbook-router/register.d.ts')).toContain(
      "declare module '@cookbook/router'",
    );
    handle.close();
  });

  it('reports invalid regeneration results without closing the watcher', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set(
      'routes.json',
      JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    );
    fs.emit('routes.json');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, false]);
    expect(fs.watchers.get('routes.json')).toHaveLength(1);
    handle.close();
  });

  it('registers a watcher for every route file', async () => {
    const fs = createMemoryFileSystem({
      'routes-a.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
      'routes-b.json': JSON.stringify({ routes: [{ id: 'about', path: '/about' }] }),
    });

    const handle = watchCommand({
      routeFiles: ['routes-a.json', 'routes-b.json'],
      fs,
      debounceMs: 0,
    });
    await handle.initial;

    expect(fs.watchers.get('routes-a.json')).toHaveLength(1);
    expect(fs.watchers.get('routes-b.json')).toHaveLength(1);

    handle.close();
    expect(fs.watchers.get('routes-a.json')).toEqual([]);
    expect(fs.watchers.get('routes-b.json')).toEqual([]);
  });

  it('requires route files because in-memory routes cannot be watched', async () => {
    const results: string[] = [];
    const handle = watchCommand({
      routes: sampleRoutes,
      onChange: (result) => {
        results.push(result.errors[0] ?? '');
      },
    });

    await expect(handle.initial).resolves.toEqual({
      ok: false,
      files: [],
      errors: ['Watch mode requires at least one route file. Pass --routes <file>.'],
    });
    expect(results).toEqual(['Watch mode requires at least one route file. Pass --routes <file>.']);
    handle.close();
  });

  it('reports file watcher setup failures as the initial result', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    fs.watch = () => {
      throw new Error('watch unavailable');
    };
    const results: string[] = [];

    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      onChange: (result) => {
        results.push(result.errors[0] ?? '');
      },
    });

    await expect(handle.initial).resolves.toEqual({
      ok: false,
      files: [],
      errors: ['watch unavailable'],
    });
    expect(results).toEqual(['watch unavailable']);
    handle.close();
  });

  it('reports missing file system watch support', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    fs.watch = undefined as never;
    const results: string[] = [];

    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      onChange: (result) => {
        results.push(result.errors[0] ?? '');
      },
    });

    await expect(handle.initial).resolves.toEqual({
      ok: false,
      files: [],
      errors: ['Watch mode requires a file system with watch support.'],
    });
    expect(results).toEqual(['Watch mode requires a file system with watch support.']);
    handle.close();
  });

  it('closes previously opened watchers when setup later fails', async () => {
    const fs = createMemoryFileSystem({
      'routes-a.json': JSON.stringify({ routes: [{ id: 'a', path: '/a' }] }),
      'routes-b.json': JSON.stringify({ routes: [{ id: 'b', path: '/b' }] }),
    });
    const originalWatch = fs.watch;

    if (!originalWatch) {
      throw new Error('Expected memory file system to support watch.');
    }

    fs.watch = (path, listener) => {
      if (path === 'routes-b.json') {
        throw new Error('second watcher failed');
      }

      return originalWatch.call(fs, path, listener);
    };

    const handle = watchCommand({
      routeFiles: ['routes-a.json', 'routes-b.json'],
      fs,
      debounceMs: 0,
    });

    await expect(handle.initial).resolves.toEqual({
      ok: false,
      files: [],
      errors: ['second watcher failed'],
    });
    expect(fs.watchers.get('routes-a.json')).toEqual([]);
    handle.close();
  });

  it('coalesces rapid change events into one regeneration', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'docs', path: '/docs' }] }));
    fs.emit('routes.json');
    fs.emit('routes.json');
    fs.emit('routes.json');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, true]);
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('docs');
    handle.close();
  });

  it('refreshes watched route roots when config routeFiles changes', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
export default defineRouterConfig({ routeFiles: 'src/**/*.route.tsx' } as const);
`,
      'src/home.route.tsx': `import { defineRoute } from '@cookbook/router';
export const homeRoute = defineRoute({ id: 'home', path: '/' } as const);
`,
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      configFile: 'cookbook-router.config.ts',
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    expect(fs.watchers.get('cookbook-router.config.ts')).toHaveLength(1);
    expect(fs.watchers.get('src')).toHaveLength(1);

    fs.files.set(
      'cookbook-router.config.ts',
      `import { defineRouterConfig } from '@cookbook/router-cli';
export default defineRouterConfig({ routeFiles: 'app/**/*.route.tsx' } as const);
`,
    );
    fs.files.set(
      'app/about.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const aboutRoute = defineRoute({ id: 'about', path: '/about' } as const);
`,
    );
    fs.emit('cookbook-router.config.ts');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, true]);
    expect(fs.watchers.get('src')).toEqual([]);
    expect(fs.watchers.get('app')).toHaveLength(1);
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('about');
    handle.close();
  });

  it('close is idempotent and prevents pending regenerations', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 10,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'later', path: '/later' }] }));
    fs.emit('routes.json');
    handle.close();
    handle.close();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(results).toEqual([true]);
    expect(fs.files.get('.cookbook-router/manifest.json')).not.toContain('later');
  });

  it('generates in watch mode with custom path constraints from defineRoutes options', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}' },
] as const, {
  pathConstraints: constraints,
});
`,
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.tsx'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });

    await expect(handle.initial).resolves.toMatchObject({ ok: true });

    expect(results).toEqual([true]);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'post.show': { slug: string };",
    );
    handle.close();
  });

  it('watches route glob roots so newly added matching route files regenerate', async () => {
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
    const results: boolean[] = [];
    const handle = watchCommand({
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

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
    fs.emit('src', 'rename');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, true]);
    expect(fs.watchers.get('cookbook-router.config.ts')).toHaveLength(1);
    expect(fs.watchers.get('src')).toHaveLength(1);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.article': { slug: string };",
    );
    handle.close();
  });

  it('keeps watching configured glob roots even when no route files exist yet', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
} as const);
`,
      'src/.keep': '',
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });

    await expect(handle.initial).resolves.toMatchObject({ ok: false });
    expect(fs.watchers.get('src')).toHaveLength(1);

    fs.files.set(
      'src/blog.route.tsx',
      `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    );
    fs.emit('src', 'rename');
    await nextTick();
    await nextTick();

    expect(results).toEqual([false, true]);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
    handle.close();
  });
});
