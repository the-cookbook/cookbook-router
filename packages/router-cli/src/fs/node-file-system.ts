import { watch as nodeWatch } from 'node:fs';
import * as nodeFs from 'node:fs/promises';
import type { CliFileSystem } from '../contracts';

export const nodeFileSystem: CliFileSystem = {
  async readFile(path) {
    return nodeFs.readFile(path, 'utf8');
  },

  async writeFile(path, contents) {
    await nodeFs.writeFile(path, contents, 'utf8');
  },

  async mkdir(path, options) {
    await nodeFs.mkdir(path, options);
  },

  async stat(path) {
    return nodeFs.stat(path);
  },

  watch(path, listener) {
    return nodeWatch(path, (event, filename) => {
      listener(event, typeof filename === 'string' ? filename : null);
    });
  },
};
