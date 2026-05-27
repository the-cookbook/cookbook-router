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
