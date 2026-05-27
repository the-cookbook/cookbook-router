import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  plugins: [tailwindcss(), tsconfigPaths()],
});
