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
    async readdir(path) {
      const prefix = path === '.' ? '' : path.endsWith('/') ? path : `${path}/`;
      const entries = new Set<string>();

      for (const filePath of files.keys()) {
        if (!filePath.startsWith(prefix)) {
          continue;
        }

        const remainder = filePath.slice(prefix.length);
        const [entry] = remainder.split('/');

        if (entry) {
          entries.add(entry);
        }
      }

      return [...entries].sort();
    },
    async stat(path) {
      if (files.has(path)) {
        return { mtimeMs: 0, isFile: () => true, isDirectory: () => false };
      }

      const prefix = path === '.' ? '' : path.endsWith('/') ? path : `${path}/`;
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          return { mtimeMs: 0, isFile: () => false, isDirectory: () => true };
        }
      }

      throw new Error(`ENOENT: ${path}`);
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
          tab: { type: 'string', optional: true },
          page: { type: 'string', optional: true },
          filters: { type: 'string', many: true, optional: true },
        },
        hash: { type: 'enum', values: ['profile', 'settings'], optional: true },
        meta: {
          requiresAuth: true,
        },
      },
    ],
  },
] as const;
