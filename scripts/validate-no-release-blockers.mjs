import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.tmp']);
const ignoredFiles = new Set(['pnpm-lock.yaml']);
const textExtensions = new Set([
  '.cjs',
  '.css',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yml',
  '.yaml',
]);
const todoToken = ['TO', 'DO'].join('');
const forbiddenRules = [
  {
    name: 'unfinished work marker',
    test: (content) => new RegExp(`\\b${todoToken}\\b`).test(content),
  },
  {
    name: 'disabled test',
    test: (content) => /\b(?:describe|it|test)\.skip\s*\(/.test(content),
  },
  {
    name: 'focused test',
    test: (content) => /\b(?:describe|it|test)\.only\s*\(/.test(content),
  },
];

const failures = [];

for await (const filePath of walk(root)) {
  const pathFromRoot = relative(root, filePath);

  if (ignoredFiles.has(pathFromRoot)) {
    continue;
  }

  if (!textExtensions.has(extensionOf(filePath))) {
    continue;
  }

  const content = await readFile(filePath, 'utf8');

  for (const rule of forbiddenRules) {
    if (rule.test(content)) {
      failures.push(`${pathFromRoot}: contains ${rule.name}.`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        yield* walk(join(directory, entry.name));
      }
      continue;
    }

    if (entry.isFile()) {
      yield join(directory, entry.name);
    }
  }
}

function extensionOf(path) {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(index);
}
