import type { Compiler, WebpackPluginInstance } from 'webpack';
import {
  applyRouterCompilerBuildHooks,
  type CookbookRouterBuilderPluginOptions,
} from '@cookbook/router-cli';

const PLUGIN_NAME = 'CookbookRouterPlugin';

export interface CookbookRouterPluginOptions extends CookbookRouterBuilderPluginOptions {}

/** Webpack plugin that writes Cookbook Router physical artifacts before compilation. */
export class CookbookRouterPlugin implements WebpackPluginInstance {
  readonly #options: CookbookRouterPluginOptions;

  constructor(options: CookbookRouterPluginOptions = {}) {
    this.#options = options;
  }

  apply(compiler: Compiler): void {
    applyRouterCompilerBuildHooks(compiler as never, {
      ...this.#options,
      pluginName: PLUGIN_NAME,
    });
  }
}

export default CookbookRouterPlugin;
