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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['dist/**', 'node_modules/**'],
    globals: true,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/contracts.ts',
        'src/**/contracts.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
