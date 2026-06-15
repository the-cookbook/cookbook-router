import { generateCommand } from './generate';
import { nodeFileSystem } from '../fs/node-file-system';
import { resolveEffectiveRouteOptions } from '../generation/resolve-route-input';
import type { CommandResult, WatchHandle, WatchOptions } from '../contracts';

/** Options for watch-mode generation. */
export interface WatchCommandOptions extends WatchOptions {}

const DEFAULT_DEBOUNCE_MS = 50;

interface ActiveWatcher {
  readonly path: string;
  readonly close: () => void;
}

/**
 * Watches route/config files and re-runs generation after a debounce.
 *
 * Failed regenerations keep the previous generated files because generation
 * validates before writing artifacts.
 */
export function watchCommand(options: WatchCommandOptions): WatchHandle {
  const fs = options.fs ?? nodeFileSystem;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const watchers = new Map<string, ActiveWatcher>();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let rerunRequested = false;

  const notify = async (result: CommandResult): Promise<void> => {
    await options.onChange?.(result);
  };

  const reconcileWatchers = async (): Promise<CommandResult | undefined> => {
    if (!fs.watch) {
      return failure('Watch mode requires a file system with watch support.');
    }

    const effectiveOptions = await resolveEffectiveRouteOptions({
      ...options,
      fs,
      allowEmptyRouteFiles: true,
    });
    const paths = [
      ...(effectiveOptions.configFile === undefined ? [] : [effectiveOptions.configFile]),
      ...(effectiveOptions.routeFileWatchPaths ?? effectiveOptions.routeFiles ?? []),
    ];
    const nextPaths = new Set(paths);

    if (!nextPaths.size) {
      return failure('Watch mode requires at least one route file. Pass --routes <file>.');
    }

    for (const [path, watcher] of watchers) {
      if (nextPaths.has(path)) {
        continue;
      }

      watcher.close();
      watchers.delete(path);
    }

    const opened: ActiveWatcher[] = [];

    try {
      for (const path of nextPaths) {
        if (watchers.has(path)) {
          continue;
        }

        const handle = fs.watch(path, () => schedule());
        const watcher = { path, close: handle.close };
        watchers.set(path, watcher);
        opened.push(watcher);
      }
    } catch (error) {
      for (const watcher of opened) {
        watcher.close();
        watchers.delete(watcher.path);
      }

      if (!watchers.size) {
        return failure(error instanceof Error ? error.message : String(error));
      }

      throw error;
    }

    return undefined;
  };

  const run = async (): Promise<CommandResult> => {
    if (closed) {
      return failure('Watch command is closed.');
    }

    const setupError = await reconcileWatchers();
    if (setupError) {
      return setupError;
    }

    return generateCommand({ ...options, fs });
  };

  const runAndNotify = async (): Promise<CommandResult> => {
    const result = await run();
    await notify(result);
    return result;
  };

  const flush = (): void => {
    if (closed) {
      return;
    }

    if (running) {
      rerunRequested = true;
      return;
    }

    running = true;
    void runAndNotify()
      .catch((error: unknown) =>
        notify(failure(error instanceof Error ? error.message : String(error))),
      )
      .finally(() => {
        running = false;

        if (rerunRequested && !closed) {
          rerunRequested = false;
          schedule();
        }
      });
  };

  const schedule = (): void => {
    if (closed) {
      return;
    }

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      flush();
    }, debounceMs);
  };

  const initial = runAndNotify();

  return {
    initial,
    close: () => {
      if (closed) {
        return;
      }

      closed = true;

      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }

      for (const watcher of watchers.values()) {
        watcher.close();
      }
      watchers.clear();
    },
  };
}

function failure(message: string): CommandResult {
  return { ok: false, files: [], errors: [message] };
}
