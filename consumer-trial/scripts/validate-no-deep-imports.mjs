import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const allowed = new Set(['@cookbook/router', '@cookbook/router-react']);
const files = await collectFiles(sourceRoot);
const offenders = [];

for (const file of files) {
  const contents = await readFile(file, 'utf8');
  const imports = contents.matchAll(/from ['"](@cookbook\/router(?:-react)?[^'"]*)['"]/g);

  for (const match of imports) {
    if (!allowed.has(match[1])) {
      offenders.push(`${file}: ${match[1]}`);
    }
  }
}

if (offenders.length) {
  throw new Error(`Consumer trial must not use deep package imports:\n${offenders.join('\n')}`);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      output.push(...(await collectFiles(path)));
      continue;
    }

    if (/\.[cm]?tsx?$/.test(entry.name)) {
      output.push(path);
    }
  }

  return output;
}
