import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      target: 'es2022',
    },
    base: env.VITE_BASE_PATH || '/',
    plugins: [tailwindcss(), tsconfigPaths()],
  };
});
