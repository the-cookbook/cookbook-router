import { describe, expect, test } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { watchCommand } from './watch';

describe('watchCommand', () => {
  test('generates initially and registers route file watchers', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      onChange: (result) => {
        results.push(result.ok);
      },
    });

    await expect(handle.initial).resolves.toMatchObject({ ok: true });

    expect(results).toEqual([true]);
    expect(fs.watchers.get('routes.json')).toHaveLength(1);
    handle.close();
    expect(fs.watchers.get('routes.json')).toEqual([]);
  });

  test('regenerates after route file changes', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'about', path: '/about' }] }));
    fs.emit('routes.json');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(results).toEqual([true, true]);
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('about');
    expect(fs.files.get('.cookbook-router/register.d.ts')).toContain(
      "declare module '@cookbook/router'",
    );
    handle.close();
  });

  test('reports invalid regeneration results', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set(
      'routes.json',
      JSON.stringify({ routes: [{ id: 'bad', index: true, path: '/bad' }] }),
    );
    fs.emit('routes.json');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(results).toEqual([true, false]);
    handle.close();
  });
});
