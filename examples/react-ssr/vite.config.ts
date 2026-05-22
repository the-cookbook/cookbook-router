import { defineConfig } from 'vite';
import { createReactSsrDevPlugin } from './src/dev-server';

export default defineConfig({
  plugins: [createReactSsrDevPlugin()],
  build: {
    target: 'es2022',
  },
});
