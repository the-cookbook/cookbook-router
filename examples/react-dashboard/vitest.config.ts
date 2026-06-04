import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const rootDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const exampleDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': resolve(exampleDir, 'app'),
      '@cookbook/router': resolve(rootDir, 'packages/router/src/index.ts'),
      '@cookbook/router-react': resolve(
        rootDir,
        'packages/router-react/src/index.ts'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['app/test-setup.ts'],
    globals: true,
    isolate: true,
    testTimeout: 15_000,
  },
});
