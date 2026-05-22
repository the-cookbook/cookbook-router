import { describe, expect, test } from 'vitest';
import { nodeFileSystem } from './node-file-system';

describe('nodeFileSystem', () => {
  test('exposes the CLI file system contract', () => {
    expect(typeof nodeFileSystem.readFile).toBe('function');
    expect(typeof nodeFileSystem.writeFile).toBe('function');
    expect(typeof nodeFileSystem.mkdir).toBe('function');
    expect(typeof nodeFileSystem.stat).toBe('function');
    expect(typeof nodeFileSystem.watch).toBe('function');
  });
});
