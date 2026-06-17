import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { generateCommand, resolveRoutes } from './generate';

describe('generateCommand', () => {
  it('writes generated contracts, manifest, and registration files', async () => {
    const fs = createMemoryFileSystem();
    const result = await generateCommand({ routes: sampleRoutes, outDir: 'generated', fs });

    expect(result).toEqual({
      ok: true,
      files: ['generated/contracts.ts', 'generated/manifest.json', 'generated/register.d.ts'],
      errors: [],
      changedFiles: [
        'generated/contracts.ts',
        'generated/manifest.json',
        'generated/register.d.ts',
      ],
    });
    expect(fs.files.get('generated/contracts.ts')).toContain('/* eslint-disable */');
    expect(fs.files.get('generated/contracts.ts')).toContain('export interface RouterContracts');
    expect(fs.files.get('generated/contracts.ts')).toContain('/* eslint-enable */');
    expect(fs.files.get('generated/manifest.json')).toContain('"users.show"');
    expect(fs.files.get('generated/register.d.ts')).toContain("declare module '@cookbook/router'");
  });

  it('does not rewrite unchanged generated artifacts', async () => {
    const fs = createMemoryFileSystem();

    await expect(generateCommand({ routes: sampleRoutes, fs })).resolves.toMatchObject({
      ok: true,
    });

    let writes = 0;
    const originalWriteFile = fs.writeFile;
    fs.writeFile = async (path, contents) => {
      writes += 1;
      await originalWriteFile(path, contents);
    };

    await expect(generateCommand({ routes: sampleRoutes, fs })).resolves.toMatchObject({
      ok: true,
    });

    expect(writes).toBe(0);
  });

  it('loads routes from route files', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });

    await expect(resolveRoutes({ routeFiles: ['routes.json'], fs })).resolves.toEqual(sampleRoutes);
  });

  it('returns an error when no route source exists', async () => {
    await expect(resolveRoutes({})).rejects.toThrow('No routes');
  });

  it('returns command errors for invalid configuration', async () => {
    const result = await generateCommand({ routes: [{ id: 'bad', index: true, path: '/bad' }] });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('index');
  });

  it('refuses to write generated artifacts over route source files', async () => {
    const fs = createMemoryFileSystem({
      '.cookbook-router/contracts.ts': JSON.stringify({ routes: sampleRoutes }),
    });
    const result = await generateCommand({ routeFiles: ['.cookbook-router/contracts.ts'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain(
      'Refusing to write generated router artifacts over route source file',
    );
  });

  it('returns command errors for file system failures', async () => {
    const fs = createMemoryFileSystem();
    fs.writeFile = async () => {
      throw new Error('disk full');
    };

    const result = await generateCommand({ routes: sampleRoutes, fs });

    expect(result).toEqual({ ok: false, files: [], errors: ['disk full'] });
  });

  it('generates artifacts from a TypeScript route file using defineRoutes', async () => {
    const { mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(join(tmpdir(), 'cookbook-router-generate-tsx-'));
    const routeFile = join(dir, 'routes.tsx');
    const pageFile = join(dir, 'pages.tsx');
    const outDir = join(dir, '.cookbook-router');

    try {
      await writeFile(
        pageFile,
        `export function RootLayout() { return null; }
export function HomePage() { return null; }
export function UserPage() { return null; }
`,
      );
      await writeFile(
        routeFile,
        `import { defineRoutes } from '@cookbook/router';
import { HomePage, RootLayout, UserPage } from './pages';

export const lifecycleEvents: string[] = [];

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    layout: { view: RootLayout },
    children: [
      { id: 'home', index: true, view: HomePage, meta: { title: 'Home' } },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: { tab: { type: 'string', optional: true } },
        hash: { type: 'enum', values: ['profile', 'settings', 'security'], optional: true },
        view: UserPage,
        meta: { title: 'User', requiresAuth: true },
        lifecycle: {
          beforeEnter: () => {
            lifecycleEvents.push('users.beforeEnter');
          },
          afterEnter: () => {
            lifecycleEvents.push('users.afterEnter');
          },
        },
      },
    ],
  },
] as const);
`,
      );

      const result = await generateCommand({ routeFiles: [routeFile], outDir });

      expect(result.ok).toBe(true);
      const contracts = await readFile(join(outDir, 'contracts.ts'), 'utf8');
      expect(contracts).toContain("'users.show': { id: number };");
      expect(contracts).toContain('tab?: string');
      expect(contracts).toContain("'profile' | 'settings' | 'security'");
      await expect(readFile(join(outDir, 'register.d.ts'), 'utf8')).resolves.toContain(
        "declare module '@cookbook/router'",
      );
      await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain(
        'users.show',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('uses defineRoutes for generated modules that only import static route-tree exports', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  {
    id: 'root',
    path: '/',
    children: [{ id: 'absolute.child', path: '/child' }],
  },
] as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      "import { defineRoutes } from '@cookbook/router/route-config';",
    );
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      'export const routes = defineRoutes([',
    );
    expect(fs.files.get('.cookbook-router/routes.ts')).not.toContain('defineRouteTree');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('absolute.child');
  });

  it('generates contracts from route files with custom path constraints', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

const constraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};

function PostPage() { return null; }

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:slug}', view: PostPage },
] as const, {
  pathConstraints: constraints,
});
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'post.show': { slug: string };",
    );
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('/posts/{slug:slug}');
  });

  it('generates contracts from route files with inline custom path constraints', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'post.show', path: '/posts/{slug:inlineCliSlug}' },
] as const, {
  pathConstraints: {
    inlineCliSlug: createPathConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    }),
  },
});
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'post.show': { slug: string };",
    );
  });

  it('generates URLKit static search types and route URL options from route files', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  {
    id: 'products.show',
    path: '/products/{price:int}',
    search: {
      page: { type: 'int', default: 1 },
      tags: { type: 'string', many: true },
      sort: { type: 'enum', values: ['new', 'top'], optional: true },
    },
    hash: { type: 'enum', values: ['details', 'reviews'], optional: true },
    url: { arrayFormat: 'comma' },
  },
] as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'products.show': { price: number };",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'products.show': { page: number; tags: readonly string[]; sort?: 'new' | 'top' };",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'products.show': 'details' | 'reviews' | undefined;",
    );
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('"arrayFormat": "comma"');
  });

  it('generates built-in URLKit constraint params as parsed numbers', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'users.show', path: '/users/{id:int}' },
] as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'users.show': { id: number };",
    );
  });

  it('preserves configured pathOptions in generated routes module', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  outDir: '.cookbook-router',
  pathOptions: { prune: 'all' },
} as const);
`,
      'src/home.route.tsx': `import { defineRoute } from '@cookbook/router';
export const homeRoute = defineRoute({ id: 'home', path: '/' } as const);
`,
    });

    const result = await generateCommand({ fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('pathOptions: {"prune":"all"},');
  });

  it('extracts colocated defineRoute declarations exported separately', async () => {
    const fs = createMemoryFileSystem({
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';

const route = defineRoute({ id: 'blog', path: '/blog' } as const);

export { route as blogRoute };
`,
    });

    const result = await generateCommand({ routeFiles: ['src/blog.route.tsx'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      "import { blogRoute as blogRoute0 } from '../src/blog.route';",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('blog');
  });

  it('preserves imported config pathConstraints in generated routes module', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './src/path-constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathConstraints,
} as const);
`,
      'src/path-constraints.ts': `import { createPathConstraint } from '@cookbook/router';

export const pathConstraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};
`,
      'src/post.route.tsx': `import { defineRoute } from '@cookbook/router';
export const postRoute = defineRoute({ id: 'post.show', path: '/posts/{slug:slug}' } as const);
`,
    });

    const result = await generateCommand({ fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      "import { pathConstraints as __cookbookPathConstraints } from '../src/path-constraints';",
    );
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      'pathConstraints: __cookbookPathConstraints,',
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'post.show': { slug: string };",
    );
  });

  it('generates contracts and routes module from colocated defineRoute files', async () => {
    const fs = createMemoryFileSystem({
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
      'src/article.route.tsx': `import { defineHash, defineRoute, defineSearch, mergeSearch } from '@cookbook/router';
const querySearch = defineSearch({ q: { type: 'string', optional: true } } as const);
const articleSearch = mergeSearch(querySearch, { page: { type: 'int', default: 1 } } as const);
const articleHash = defineHash({ type: 'enum', values: ['comments', 'share'], optional: true } as const);
export const articleRoute = defineRoute({
  id: 'blog.articles.show',
  parent: 'blog',
  path: 'articles/{slug}',
  search: articleSearch,
  hash: articleHash,
} as const);
`,
    });

    const result = await generateCommand({
      routeFiles: ['src/blog.route.tsx', 'src/article.route.tsx'],
      fs,
    });

    expect(result.ok).toBe(true);
    expect(result.files).toContain('.cookbook-router/routes.ts');
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      "import { blogRoute as blogRoute0 } from '../src/blog.route';",
    );
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      "import { articleRoute as articleRoute1 } from '../src/article.route';",
    );
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain('defineRouteTree');
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.articles.show': { slug: string };",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.articles.show': { q?: string; page: number };",
    );
  });

  it('generates contracts from a manual defineRouteTree file with imported route declarations', async () => {
    const fs = createMemoryFileSystem({
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
export const articleRoute = defineRoute({
  id: 'blog.article',
  parent: 'blog',
  path: 'articles/{slug}',
} as const);
`,
      'src/routes.ts': `import { defineRouteTree } from '@cookbook/router';
import { blogRoute } from './blog.route';
import { articleRoute as article } from './article.route';

export const routes = defineRouteTree({
  routes: [blogRoute, article],
} as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['src/routes.ts'], fs });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.article': { slug: string };",
    );
    expect(fs.files.get('.cookbook-router/routes.ts')).toContain(
      "import { routes as routes0 } from '../src/routes';",
    );
  });
  it('resolves reusable URL descriptors imported by route files', async () => {
    const fs = createMemoryFileSystem({
      'src/routes/url-state.ts': `import { defineHash, defineSearch, mergeSearch } from '@cookbook/router';

const querySearch = defineSearch({ q: { type: 'string', optional: true } } as const);
export const articleSearch = mergeSearch(querySearch, {
  page: { type: 'int', default: 1 },
} as const);
export const articleHash = defineHash({
  type: 'enum',
  values: ['comments', 'share'],
  optional: true,
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
import { articleHash, articleSearch as search } from './routes/url-state';

export const articleRoute = defineRoute({
  id: 'blog.article',
  parent: 'blog',
  path: 'articles/{slug}',
  search,
  hash: articleHash,
} as const);
`,
    });

    const result = await generateCommand({
      routeFiles: ['src/blog.route.tsx', 'src/article.route.tsx'],
      fs,
    });

    expect(result.ok).toBe(true);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.article': { q?: string; page: number };",
    );
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain(
      "'blog.article': 'comments' | 'share' | undefined;",
    );
  });

  it('writes default generated output relative to the config root', async () => {
    const fs = createMemoryFileSystem({
      'app/cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
} as const);
`,
      'app/src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
    });

    const result = await generateCommand({ cwd: 'app', fs });

    expect(result.ok).toBe(true);
    expect(result.files).toEqual([
      'app/.cookbook-router/routes.ts',
      'app/.cookbook-router/contracts.ts',
      'app/.cookbook-router/manifest.json',
      'app/.cookbook-router/register.d.ts',
    ]);
    expect(fs.files.get('app/.cookbook-router/contracts.ts')).toContain('blog');
  });

  it('loads config route globs and writes configured output', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
  outDir: '.generated-router',
} as const);
`,
      'src/blog.route.tsx': `import { defineRoute } from '@cookbook/router';
export const blogRoute = defineRoute({ id: 'blog', path: '/blog' } as const);
`,
      'src/article.route.tsx': `import { defineRoute } from '@cookbook/router';
export const articleRoute = defineRoute({
  id: 'blog.article',
  parent: 'blog',
  path: 'articles/{slug}',
} as const);
`,
    });

    const result = await generateCommand({ fs });

    expect(result.ok).toBe(true);
    expect(result.files).toEqual([
      '.generated-router/routes.ts',
      '.generated-router/contracts.ts',
      '.generated-router/manifest.json',
      '.generated-router/register.d.ts',
    ]);
    expect(fs.files.get('.generated-router/contracts.ts')).toContain(
      "'blog.article': { slug: string };",
    );
  });

  it('validates statically collected defineRoutes files before writing artifacts', async () => {
    const fs = createMemoryFileSystem({
      'routes.tsx': `import { defineRoutes } from '@cookbook/router';

export const routes = defineRoutes([
  { id: 'bad.index', index: true, path: '/bad' },
] as const);
`,
    });

    const result = await generateCommand({ routeFiles: ['routes.tsx'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('index route');
    expect(fs.files.has('.cookbook-router/contracts.ts')).toBe(false);
  });

  it('validates direct route input before writing artifacts', async () => {
    const fs = createMemoryFileSystem();
    const result = await generateCommand({
      routes: [{ id: 'bad.index', index: true, path: '/bad' }],
      fs,
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('index route');
    expect(fs.files.has('.cookbook-router/contracts.ts')).toBe(false);
  });

  it('rejects conflicting pathOptions from multiple route sources', async () => {
    const fs = createMemoryFileSystem({
      'routes-a.tsx': `import { defineRoutes } from '@cookbook/router';
export const routesA = defineRoutes([{ id: 'a', path: '/a' }] as const, {
  pathOptions: { prune: 'all' },
});
`,
      'routes-b.tsx': `import { defineRoutes } from '@cookbook/router';
export const routesB = defineRoutes([{ id: 'b', path: '/b' }] as const, {
  pathOptions: { prune: 'none' },
});
`,
    });

    const result = await generateCommand({ routeFiles: ['routes-a.tsx', 'routes-b.tsx'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Conflicting pathOptions');
    expect(fs.files.has('.cookbook-router/contracts.ts')).toBe(false);
  });

  it('rejects duplicate path constraint names from multiple route sources', async () => {
    const fs = createMemoryFileSystem({
      'routes-a.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';
export const routesA = defineRoutes([{ id: 'a', path: '/a/{slug:slug}' }] as const, {
  pathConstraints: {
    slug: createPathConstraint({ parse: () => undefined, verify: () => undefined, toRegExp: () => '[a-z]+' }),
  },
});
`,
      'routes-b.tsx': `import { createPathConstraint, defineRoutes } from '@cookbook/router';
export const routesB = defineRoutes([{ id: 'b', path: '/b/{slug:slug}' }] as const, {
  pathConstraints: {
    slug: createPathConstraint({ parse: () => undefined, verify: () => undefined, toRegExp: () => '[a-z0-9]+' }),
  },
});
`,
    });

    const result = await generateCommand({ routeFiles: ['routes-a.tsx', 'routes-b.tsx'], fs });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Duplicate path constraint name "slug"');
    expect(fs.files.has('.cookbook-router/contracts.ts')).toBe(false);
  });
});
