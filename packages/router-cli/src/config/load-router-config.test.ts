import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem } from '../test-helpers';
import { loadRouterConfig, parseRouterConfig } from './load-router-config';

describe('loadRouterConfig', () => {
  it('loads cookbook-router.config.ts from the working directory', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.{ts,tsx}',
  outDir: '.generated-router',
} as const);
`,
    });

    await expect(loadRouterConfig({ fs })).resolves.toMatchObject({
      configFile: 'cookbook-router.config.ts',
      rootDir: '.',
      config: {
        routeFiles: 'src/**/*.route.{ts,tsx}',
        outDir: '.generated-router',
      },
    });
  });

  it('loads config from a static default identifier', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

const config = defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  outDir: '.generated-router',
} as const);

export default config;
`,
    });

    const loaded = await loadRouterConfig({ fs });

    expect(loaded?.config).toMatchObject({
      routeFiles: 'src/**/*.route.tsx',
      outDir: '.generated-router',
    });
  });

  it('loads config from a static default object identifier', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `const config = {
  routeFiles: 'src/**/*.route.tsx',
  pathOptions: { prune: 'all' },
} as const;

export default config;
`,
    });

    const loaded = await loadRouterConfig({ fs });

    expect(loaded?.config).toMatchObject({
      routeFiles: 'src/**/*.route.tsx',
      pathOptions: { prune: 'all' },
    });
  });

  it('parses static path constraints from config', () => {
    const config = parseRouterConfig(
      'cookbook-router.config.ts',
      `import { createPathConstraint } from '@cookbook/router';
import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: ['src/**/*.route.tsx'],
  pathConstraints: {
    slug: createPathConstraint({
      parse: () => undefined,
      verify: () => undefined,
      toRegExp: () => '[a-z0-9-]+',
    }),
  },
} as const);
`,
    );

    expect(config.routeFiles).toEqual(['src/**/*.route.tsx']);
    expect(config.pathConstraints?.slug).toBeDefined();
  });

  it('parses config pathOptions with const assertions', () => {
    const config = parseRouterConfig(
      'cookbook-router.config.ts',
      `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathOptions: { prune: 'all' } as const,
} as const);
`,
    );

    expect(config.pathOptions).toEqual({ prune: 'all' });
  });

  it('parses config pathOptions from static declarations', () => {
    const config = parseRouterConfig(
      'cookbook-router.config.ts',
      `import { defineRouterConfig } from '@cookbook/router-cli';

const pathOptions = { prune: 'all' } as const;

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathOptions,
} as const);
`,
    );

    expect(config.pathOptions).toEqual({ prune: 'all' });
  });

  it('loads imported runtime-safe path constraints from config', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
import { constraints as routeConstraints } from './src/path-constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathConstraints: routeConstraints,
} as const);
`,
      'src/path-constraints.ts': `import { createPathConstraint } from '@cookbook/router';

export const constraints = {
  slug: createPathConstraint({
    parse: () => undefined,
    verify: () => undefined,
    toRegExp: () => '[a-z0-9-]+',
  }),
};
`,
    });

    const loaded = await loadRouterConfig({ fs });

    expect(loaded?.config.pathConstraints?.slug).toBeDefined();
    expect(loaded?.runtimeRouteOptions?.pathConstraints).toEqual({
      path: 'src/path-constraints.ts',
      exportName: 'constraints',
    });
  });

  it('loads shorthand imported pathConstraints from config', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathConstraints,
} as const);
`,
      'constraints.ts': `import { createPathConstraint } from '@cookbook/router';

export const pathConstraints = {
  slug: createPathConstraint({ parse: () => undefined, verify: () => undefined }),
};
`,
    });

    const loaded = await loadRouterConfig({ fs });

    expect(loaded?.config.pathConstraints?.slug).toBeDefined();
    expect(loaded?.runtimeRouteOptions?.pathConstraints).toEqual({
      path: 'constraints.ts',
      exportName: 'pathConstraints',
    });
  });

  it('loads named-export aliases for imported pathConstraints from config', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './constraints';

export default defineRouterConfig({
  routeFiles: 'src/**/*.route.tsx',
  pathConstraints,
} as const);
`,
      'constraints.ts': `import { createPathConstraint } from '@cookbook/router';

const constraints = {
  slug: createPathConstraint({ parse: () => undefined, verify: () => undefined }),
};

export { constraints as pathConstraints };
`,
    });

    const loaded = await loadRouterConfig({ fs });

    expect(loaded?.config.pathConstraints?.slug).toBeDefined();
    expect(loaded?.runtimeRouteOptions?.pathConstraints).toEqual({
      path: 'constraints.ts',
      exportName: 'pathConstraints',
    });
  });

  it('parses routeFiles and outDir from static config constants', () => {
    const config = parseRouterConfig(
      'cookbook-router.config.ts',
      `import { defineRouterConfig } from '@cookbook/router-cli';

const routeFiles = ['src/**/*.route.tsx', 'features/**/*.route.tsx'] as const;
const outDir = '.generated-router' as const;

export default defineRouterConfig({
  routeFiles,
  outDir,
} as const);
`,
    );

    expect(config.routeFiles).toEqual(['src/**/*.route.tsx', 'features/**/*.route.tsx']);
    expect(config.outDir).toBe('.generated-router');
  });

  it('loads config routeFiles shorthand from static declarations', async () => {
    const fs = createMemoryFileSystem({
      'cookbook-router.config.ts': `import { defineRouterConfig } from '@cookbook/router-cli';

const routeFiles = 'src/**/*.route.tsx' as const;

export default defineRouterConfig({ routeFiles } as const);
`,
    });

    const loaded = await loadRouterConfig({ fs });

    expect(loaded?.config.routeFiles).toBe('src/**/*.route.tsx');
  });

  it('rejects computed routeFiles values instead of evaluating config code', () => {
    expect(() =>
      parseRouterConfig(
        'cookbook-router.config.ts',
        `import { defineRouterConfig } from '@cookbook/router-cli';

export default defineRouterConfig({
  routeFiles: getRouteFiles(),
} as const);
`,
      ),
    ).toThrow('property "routeFiles" must be a static string or string array');
  });

  it('reports explicit missing config files with a CLI diagnostic', async () => {
    const fs = createMemoryFileSystem({});

    await expect(loadRouterConfig({ configFile: 'missing.config.ts', fs })).rejects.toThrow(
      'Router config "missing.config.ts" could not be found or read.',
    );
  });
});
