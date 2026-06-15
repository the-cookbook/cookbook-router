import {
  createRouterBuildRunner,
  formatRouterBuildErrors,
  type CookbookRouterBuilderPluginOptions,
} from '@cookbook/router-cli';

const PLUGIN_NAME = 'cookbook-router-bun-plugin';

export interface CookbookRouterBunPluginOptions extends CookbookRouterBuilderPluginOptions {}

/** Bun bundler plugin that writes Cookbook Router physical artifacts before each build. */
export function cookbookRouterBunPlugin(
  options: CookbookRouterBunPluginOptions = {},
): Bun.BunPlugin {
  const runner = createRouterBuildRunner(options);

  return {
    name: PLUGIN_NAME,
    setup(build) {
      build.onStart(async () => {
        const result = await runner.run();

        if (!result.ok) {
          throw new Error(formatRouterBuildErrors(result.errors));
        }
      });
    },
  };
}

export default cookbookRouterBunPlugin;
