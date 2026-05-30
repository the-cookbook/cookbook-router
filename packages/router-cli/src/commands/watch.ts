import { generateCommand } from './generate';
import { nodeFileSystem } from '../node-file-system';
import type { CommandResult, WatchHandle, WatchOptions } from '../contracts';

/** Options for watch-mode generation. */
export interface WatchCommandOptions extends WatchOptions {}

const DEFAULT_DEBOUNCE_MS = 50;

/**
 * Watches route files and re-runs generation after a debounce.
 *
 * The returned handle exposes the initial command result and a cleanup function
 * that closes active watchers.
 */
export function watchCommand(options: WatchCommandOptions): WatchHandle {
  const watchers: { close: () => void }[] = [];
  const fs = options.fs ?? nodeFileSystem;
  const routeFiles = options.routeFiles ?? [];
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let rerunRequested = false;
  let setupError: string | undefined;

  const notify = async (result: CommandResult): Promise<void> => {
    await options.onChange?.(result);
  };

  const run = async (): Promise<CommandResult> => {
    if (closed) {
      return failure('Watch command is closed.');
    }

    if (!routeFiles[0]) {
      return failure('Watch mode requires at least one route file. Pass --routes <file>.');
    }

    if (setupError) {
      return failure(setupError);
    }

    return generateCommand(options);
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

  try {
    if (!fs.watch) {
      setupError = 'Watch mode requires a file system with watch support.';
    } else {
      for (const routeFile of routeFiles) {
        watchers.push(fs.watch(routeFile, () => schedule()));
      }
    }
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
    for (const watcher of watchers) {
      watcher.close();
    }
    watchers.length = 0;
  }

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

      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}

function failure(message: string): CommandResult {
  return { ok: false, files: [], errors: [message] };
}
