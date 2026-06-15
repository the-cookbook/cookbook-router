import type { Compiler, RspackPluginInstance } from '@rspack/core';
import {
  applyRouterCompilerBuildHooks,
  type CookbookRouterBuilderPluginOptions,
} from '@cookbook/router-cli';

const PLUGIN_NAME = 'CookbookRouterRspackPlugin';

export interface CookbookRouterRspackPluginOptions extends CookbookRouterBuilderPluginOptions {}

/** Rspack plugin that writes Cookbook Router physical artifacts before compilation. */
export class CookbookRouterRspackPlugin implements RspackPluginInstance {
  readonly #options: CookbookRouterRspackPluginOptions;

  constructor(options: CookbookRouterRspackPluginOptions = {}) {
    this.#options = options;
  }

  apply(compiler: Compiler): void {
    applyRouterCompilerBuildHooks(compiler as never, {
      ...this.#options,
      pluginName: PLUGIN_NAME,
    });
  }
}

export { CookbookRouterRspackPlugin as CookbookRouterPlugin };
export default CookbookRouterRspackPlugin;
