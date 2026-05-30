import { describe, expect, it } from 'vitest';
import { createMemoryFileSystem } from './test-helpers';

describe('test helpers', () => {
  it('stores files in memory', async () => {
    const fs = createMemoryFileSystem();

    await fs.writeFile('file.txt', 'contents');

    await expect(fs.readFile('file.txt')).resolves.toBe('contents');
  });

  it('reports missing files', async () => {
    const fs = createMemoryFileSystem();

    await expect(fs.readFile('missing.txt')).rejects.toThrow('ENOENT');
  });

  it('supports change watchers', () => {
    const fs = createMemoryFileSystem();
    const events: string[] = [];
    const watcher = fs.watch?.('routes.json', (event) => events.push(event));

    fs.emit('routes.json');
    watcher?.close();
    fs.emit('routes.json');

    expect(events).toEqual(['change']);
  });
});
