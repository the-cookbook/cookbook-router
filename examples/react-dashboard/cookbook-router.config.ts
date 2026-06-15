import { defineRouterConfig } from '@cookbook/router-cli';
import { pathConstraints } from './app/lib/routes/path-constraints';

export default defineRouterConfig({
  routeFiles: 'app/**/*.route.{ts,tsx}',
  outDir: '.cookbook-router',
  pathConstraints,
});
