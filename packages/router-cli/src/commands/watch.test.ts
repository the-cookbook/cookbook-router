import { describe, expect, test } from 'vitest';
import { createMemoryFileSystem, sampleRoutes } from '../test-helpers';
import { watchCommand } from './watch';

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('watchCommand', () => {
  test('generates initially and registers route file watchers', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
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

  test('regenerates generated artifacts after route file changes', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'about', path: '/about' }] }));
    fs.emit('routes.json');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, true]);
    expect(fs.files.get('.cookbook-router/contracts.ts')).toContain('about');
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('about');
    expect(fs.files.get('.cookbook-router/register.d.ts')).toContain(
      "declare module '@cookbook/router'",
    );
    handle.close();
  });

  test('reports invalid regeneration results without closing the watcher', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
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
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, false]);
    expect(fs.watchers.get('routes.json')).toHaveLength(1);
    handle.close();
  });

  test('registers a watcher for every route file', async () => {
    const fs = createMemoryFileSystem({
      'routes-a.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
      'routes-b.json': JSON.stringify({ routes: [{ id: 'about', path: '/about' }] }),
    });

    const handle = watchCommand({
      routeFiles: ['routes-a.json', 'routes-b.json'],
      fs,
      debounceMs: 0,
    });
    await handle.initial;

    expect(fs.watchers.get('routes-a.json')).toHaveLength(1);
    expect(fs.watchers.get('routes-b.json')).toHaveLength(1);

    handle.close();
    expect(fs.watchers.get('routes-a.json')).toEqual([]);
    expect(fs.watchers.get('routes-b.json')).toEqual([]);
  });

  test('requires route files because in-memory routes cannot be watched', async () => {
    const results: string[] = [];
    const handle = watchCommand({
      routes: sampleRoutes,
      onChange: (result) => {
        results.push(result.errors[0] ?? '');
      },
    });

    await expect(handle.initial).resolves.toEqual({
      ok: false,
      files: [],
      errors: ['Watch mode requires at least one route file. Pass --routes <file>.'],
    });
    expect(results).toEqual(['Watch mode requires at least one route file. Pass --routes <file>.']);
    handle.close();
  });

  test('reports file watcher setup failures as the initial result', async () => {
    const fs = createMemoryFileSystem({ 'routes.json': JSON.stringify({ routes: sampleRoutes }) });
    fs.watch = () => {
      throw new Error('watch unavailable');
    };
    const results: string[] = [];

    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      onChange: (result) => {
        results.push(result.errors[0] ?? '');
      },
    });

    await expect(handle.initial).resolves.toEqual({
      ok: false,
      files: [],
      errors: ['watch unavailable'],
    });
    expect(results).toEqual(['watch unavailable']);
    handle.close();
  });

  test('coalesces rapid change events into one regeneration', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 0,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'docs', path: '/docs' }] }));
    fs.emit('routes.json');
    fs.emit('routes.json');
    fs.emit('routes.json');
    await nextTick();
    await nextTick();

    expect(results).toEqual([true, true]);
    expect(fs.files.get('.cookbook-router/manifest.json')).toContain('docs');
    handle.close();
  });

  test('close is idempotent and prevents pending regenerations', async () => {
    const fs = createMemoryFileSystem({
      'routes.json': JSON.stringify({ routes: [{ id: 'home', path: '/' }] }),
    });
    const results: boolean[] = [];
    const handle = watchCommand({
      routeFiles: ['routes.json'],
      fs,
      debounceMs: 10,
      onChange: (result) => {
        results.push(result.ok);
      },
    });
    await handle.initial;

    fs.files.set('routes.json', JSON.stringify({ routes: [{ id: 'later', path: '/later' }] }));
    fs.emit('routes.json');
    handle.close();
    handle.close();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(results).toEqual([true]);
    expect(fs.files.get('.cookbook-router/manifest.json')).not.toContain('later');
  });
});
