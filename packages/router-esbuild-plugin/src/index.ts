import type { OnStartResult, Plugin } from 'esbuild';
import {
  createRouterBuildRunner,
  formatRouterBuildErrors,
  type CookbookRouterBuilderPluginOptions,
} from '@cookbook/router-cli';

const PLUGIN_NAME = 'cookbook-router-esbuild-plugin';

export interface CookbookRouterEsbuildPluginOptions extends CookbookRouterBuilderPluginOptions {}

/** esbuild plugin that writes Cookbook Router physical artifacts before each build. */
export function cookbookRouterEsbuildPlugin(
  options: CookbookRouterEsbuildPluginOptions = {},
): Plugin {
  const runner = createRouterBuildRunner(options);

  return {
    name: PLUGIN_NAME,
    setup(build) {
      build.onStart(async (): Promise<OnStartResult | undefined> => {
        const result = await runner.run();

        if (result.ok) {
          return undefined;
        }

        return {
          errors: [{ text: formatRouterBuildErrors(result.errors) }],
        };
      });
    },
  };
}

export default cookbookRouterEsbuildPlugin;
