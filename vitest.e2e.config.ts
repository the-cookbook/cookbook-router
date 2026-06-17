import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@cookbook/router-react/hooks': resolve(rootDir, 'packages/router-react/src/hooks/index.ts'),
      '@cookbook/router-react/links': resolve(rootDir, 'packages/router-react/src/links/index.ts'),
      '@cookbook/router-react/outlets': resolve(
        rootDir,
        'packages/router-react/src/outlets/index.ts',
      ),
      '@cookbook/router-react/provider': resolve(
        rootDir,
        'packages/router-react/src/provider/index.ts',
      ),
      '@cookbook/router/route-config': resolve(
        rootDir,
        'packages/router/src/route-config/index.ts',
      ),
      '@cookbook/router': resolve(rootDir, 'packages/router/src/index.ts'),
      '@cookbook/router-react': resolve(rootDir, 'packages/router-react/src/index.ts'),
      '@cookbook/router-cli': resolve(rootDir, 'packages/router-cli/src/index.ts'),
      '@/': `${resolve(rootDir, 'examples/react-dashboard/app')}/`,
      '@': resolve(rootDir, 'examples/react-dashboard/app'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['e2e/**/*.test.ts', 'e2e/**/*.test.tsx'],
    exclude: ['dist/**', 'node_modules/**'],
    globals: true,
    isolate: true,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'packages/*/src/**/*.ts',
        'packages/*/src/**/*.tsx',
        'examples/*/src/**/*.ts',
        'examples/*/src/**/*.tsx',
        'examples/react-dashboard/app/**/*.ts',
        'examples/react-dashboard/app/**/*.tsx',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
