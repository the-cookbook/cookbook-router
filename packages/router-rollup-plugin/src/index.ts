import type { Plugin, PluginContext } from 'rollup';
import {
  createRouterBuildRunner,
  formatRouterBuildErrors,
  type CookbookRouterBuilderPluginOptions,
} from '@cookbook/router-cli';

const PLUGIN_NAME = 'cookbook-router-rollup-plugin';

export interface CookbookRouterRollupPluginOptions extends CookbookRouterBuilderPluginOptions {}

/** Rollup/Rolldown plugin that writes Cookbook Router physical artifacts before bundling. */
export function cookbookRouterRollupPlugin(
  options: CookbookRouterRollupPluginOptions = {},
): Plugin {
  const runner = createRouterBuildRunner(options);

  return {
    name: PLUGIN_NAME,

    async buildStart(this: PluginContext) {
      const result = await runner.run();

      for (const path of result.watchPaths) {
        this.addWatchFile(path);
      }

      if (result.ok) {
        return;
      }

      const message = formatRouterBuildErrors(result.errors);
      this.warn(message);

      if (this.meta.watchMode === true) {
        return;
      }

      this.error(message);
    },
  };
}

export default cookbookRouterRollupPlugin;
