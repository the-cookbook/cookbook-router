import { watch as nodeWatch } from 'node:fs';
import { generateCommand } from './generate';
import type { CommandResult, WatchHandle, WatchOptions } from '../contracts';

export interface WatchCommandOptions extends WatchOptions {}

export function watchCommand(options: WatchCommandOptions): WatchHandle {
  const fs = options.fs;
  const watchers: { close: () => void }[] = [];
  let closed = false;
  let pending: Promise<CommandResult> = Promise.resolve({ ok: true, files: [], errors: [] });

  const run = async (notify = true): Promise<CommandResult> => {
    if (closed) {
      return { ok: false, files: [], errors: ['Watch command is closed.'] };
    }

    const result = await generateCommand(options);
    if (notify) {
      await options.onChange?.(result);
    }
    return result;
  };

  const schedule = (): void => {
    pending = pending.then(
      () => run(true),
      () => run(true),
    );
  };

  for (const routeFile of options.routeFiles ?? []) {
    const watcher = fs?.watch
      ? fs.watch(routeFile, scheduleWatch(schedule))
      : nodeWatch(routeFile, scheduleWatch(schedule));
    watchers.push(watcher);
  }

  return {
    initial: run(options.outDir === undefined),
    close: () => {
      closed = true;
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}

function scheduleWatch(
  schedule: () => void,
): (event: 'rename' | 'change', filename: string | null) => void {
  return () => schedule();
}
