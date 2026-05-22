import type { CliFileSystem } from './contracts';

export interface MemoryFileSystem extends CliFileSystem {
  readonly files: Map<string, string>;
  readonly watchers: Map<string, ((event: 'rename' | 'change', filename: string | null) => void)[]>;
  emit: (path: string, event?: 'rename' | 'change') => void;
}

export function createMemoryFileSystem(
  initialFiles: Record<string, string> = {},
): MemoryFileSystem {
  const files = new Map(Object.entries(initialFiles));
  const watchers = new Map<
    string,
    ((event: 'rename' | 'change', filename: string | null) => void)[]
  >();

  return {
    files,
    watchers,
    async readFile(path) {
      const contents = files.get(path);

      if (contents === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }

      return contents;
    },
    async writeFile(path, contents) {
      files.set(path, contents);
    },
    async mkdir(path) {
      files.set(`${path}/.dir`, '');
    },
    watch(path, listener) {
      const listeners = watchers.get(path) ?? [];
      listeners.push(listener);
      watchers.set(path, listeners);

      return {
        close: () => {
          watchers.set(
            path,
            (watchers.get(path) ?? []).filter((current) => current !== listener),
          );
        },
      };
    },
    emit(path, event = 'change') {
      for (const listener of watchers.get(path) ?? []) {
        listener(event, path);
      }
    },
  };
}

export const sampleRoutes = [
  {
    id: 'root',
    path: '/',
    children: [
      {
        id: 'home',
        index: true,
        meta: {
          title: 'Home',
        },
      },
      {
        id: 'users.show',
        path: 'users/{id:int}',
        search: {
          tab: {
            type: 'string',
            optional: true,
          },
          page: 'number',
        },
        hash: ['profile', 'settings'],
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
] as const;
